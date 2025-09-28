import { wah, passet_hub } from "@polkadot-api/descriptors"
import { state } from "@react-rxjs/core"
import { createClient } from "polkadot-api"
import { withLogsRecorder } from "polkadot-api/logs-provider"
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat"
import { getSmProvider } from "polkadot-api/sm-provider"
import { startFromWorker } from "polkadot-api/smoldot/from-worker"


import { getWsProvider } from "polkadot-api/ws-provider"
import { map, take, switchMap, startWith, BehaviorSubject, from } from "rxjs"
import { supportedChains, shuffleArray, type SupportedChain, type ChainConfig } from "./chains"

export const DEFAULT_CHAIN: SupportedChain = "wah" as SupportedChain

// Reactive selected chain
export const selectedChain$ = new BehaviorSubject<SupportedChain>(DEFAULT_CHAIN)

// Initialize Smoldot worker for light client connections (client-side only)
let smoldot: any = null

async function getSmoldot() {
  if (typeof window === 'undefined') {
    throw new Error('Smoldot can only be used on client-side')
  }
  
  if (!smoldot) {
    // @ts-ignore-next-line
    const SmWorker = (await import("polkadot-api/smoldot/worker?worker")).default
    const worker = new SmWorker()
    smoldot = startFromWorker(worker)
  }
  
  return smoldot
}

// Chain instances cache
const chainInstances = new Map<SupportedChain, Promise<any>>()

// Type guard to check if chain has chainSpec
function hasChainSpec(config: any): config is ChainConfig & { chainSpec: () => Promise<{ chainSpec: any }> } {
  return config.chainSpec !== undefined
}

async function createChainInstance(chainName: SupportedChain) {
  const config = supportedChains[chainName]
  
  // Check if chain has chainSpec (required for light client)
  if (!hasChainSpec(config)) {
    throw new Error(`Chain ${chainName} does not support light client mode (no chainSpec)`)
  }
  
  const { chainSpec } = await config.chainSpec()
  const smoldotInstance = await getSmoldot()
  return smoldotInstance.addChain({ chainSpec })
}

function getChainInstance(chainName: SupportedChain) {
  if (!chainInstances.has(chainName)) {
    chainInstances.set(chainName, createChainInstance(chainName))
  }
  return chainInstances.get(chainName)!
}

// Provider selection logic (client-side only)
function isLightClientMode(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get("smoldot") === "true"
}

// Simple provider creation with multiple endpoints
function createProvider(urls: string[]) {
  // Randomize endpoints for basic load balancing
  const shuffledUrls = shuffleArray(urls)
  const primaryUrl = shuffledUrls[0]
  

  return withPolkadotSdkCompat(getWsProvider(primaryUrl))
}

function getProvider(chainName: SupportedChain) {
  const config = supportedChains[chainName]
  
  // Use light client (Smoldot) if requested AND chain supports it
  if (isLightClientMode() && hasChainSpec(config)) {
    return getSmProvider(getChainInstance(chainName))
  }

  // Default: WebSocket provider with multiple endpoints
  return createProvider([...config.wsUrls])
}

// Create PAPI client for specific chain
// Get the correct descriptor for each chain
function getChainDescriptor(chainName: SupportedChain) {
  switch (chainName) {
    case 'passet':
      return passet_hub
    case 'wah':
      return wah
    default:
      return wah // fallback
  }
}

export async function createChainClient(chainName: SupportedChain = DEFAULT_CHAIN) {
  console.log(`🔧 Creating chain client for ${chainName}...`)
  
  const provider = await getProvider(chainName)
  const client = createClient(provider)
  
  // Get the typed API with correct descriptor for the chain
  const descriptor = getChainDescriptor(chainName)
  const typedApi = client.getTypedApi(descriptor)
  
  // Expose to browser devtools in development for easy debugging
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    ;(window as any).__PAPI_CLIENT__ = client
    ;(window as any).__PAPI_API__ = typedApi
    console.log('🔧 PAPI client exposed at window.__PAPI_CLIENT__ and window.__PAPI_API__')
  }
  
  console.log(`✅ Chain client created for ${chainName}`)
  return { client, typedApi }
}

// Reactive chain client that switches when selectedChain$ changes
export const chainClient$ = state(
  selectedChain$.pipe(
    switchMap((chainName) => {
      console.log(`🔄 Switching to chain: ${chainName}`)
      return from(createChainClient(chainName)).pipe(
        map(({ client, typedApi }) => ({ client, typedApi, chainName }))
      )
    })
  ),
  null
)

// Helper function to switch chains
export function switchToChain(chainName: SupportedChain) {
  selectedChain$.next(chainName)
}

// Simple connection state - true when we receive the first block
export const hasConnected$ = state(
  chainClient$.pipe(
    switchMap((chainClient) => 
      chainClient ? chainClient.client.finalizedBlock$.pipe(
        map(() => true),
        take(1)
      ) : from([false])
    )
  ),
  false
)

// Current block information
export const currentBlock$ = state(
  chainClient$.pipe(
    switchMap((chainClient) => 
      chainClient ? chainClient.client.finalizedBlock$ : from([null])
    )
  ),
  null
)

// Selected chain name for components
export const selectedChainName$ = state(selectedChain$, DEFAULT_CHAIN)