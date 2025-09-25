import { paseo } from "@polkadot-api/descriptors"
import { state } from "@react-rxjs/core"
import { createClient } from "polkadot-api"
import { withLogsRecorder } from "polkadot-api/logs-provider"
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat"
import { getSmProvider } from "polkadot-api/sm-provider"
import { startFromWorker } from "polkadot-api/smoldot/from-worker"

// @ts-ignore-next-line
import SmWorker from "polkadot-api/smoldot/worker?worker"

import { getWsProvider } from "polkadot-api/ws-provider"
import { map, take, switchMap, startWith, BehaviorSubject, from } from "rxjs"
import { supportedChains, shuffleArray, type SupportedChain } from "./chains"

export const DEFAULT_CHAIN: SupportedChain = "paseo" as SupportedChain

// Reactive selected chain
export const selectedChain$ = new BehaviorSubject<SupportedChain>(DEFAULT_CHAIN)

// Initialize Smoldot worker for light client connections
export const smoldot = startFromWorker(new SmWorker())

// Chain instances cache
const chainInstances = new Map<SupportedChain, Promise<any>>()

function createChainInstance(chainName: SupportedChain) {
  const config = supportedChains[chainName]
  return config.chainSpec().then(({ chainSpec }) =>
    smoldot.addChain({ chainSpec })
  )
}

function getChainInstance(chainName: SupportedChain) {
  if (!chainInstances.has(chainName)) {
    chainInstances.set(chainName, createChainInstance(chainName))
  }
  return chainInstances.get(chainName)!
}

// Provider selection logic
export const useLightClient =
  new URLSearchParams(location.search).get("smoldot") === "true"

// Simple provider creation with multiple endpoints
function createProvider(urls: string[]) {
  // Randomize endpoints for basic load balancing
  const shuffledUrls = shuffleArray(urls)
  const primaryUrl = shuffledUrls[0]
  

  return withPolkadotSdkCompat(getWsProvider(primaryUrl))
}

function getProvider(chainName: SupportedChain) {
  const config = supportedChains[chainName]
  
  

  // Use light client (Smoldot) if requested
  if (useLightClient) {
    return getSmProvider(getChainInstance(chainName))
  }

  // Default: WebSocket provider with multiple endpoints
  return createProvider([...config.wsUrls])
}

// Create PAPI client for specific chain
export function createChainClient(chainName: SupportedChain = DEFAULT_CHAIN) {


  const provider = getProvider(chainName)
  const client = createClient(provider)
  
  // Get the typed API - in real apps, you'd import different descriptors per chain
  const typedApi = client.getTypedApi(paseo)
  
  // Expose to browser devtools in development for easy debugging
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    ;(window as any).__PAPI_CLIENT__ = client
    ;(window as any).__PAPI_API__ = typedApi
    console.log('🔧 PAPI client exposed at window.__PAPI_CLIENT__ and window.__PAPI_API__')
  }
  
  return { client, typedApi }
}

// Reactive chain client that switches when selectedChain$ changes
export const chainClient$ = state(
  selectedChain$.pipe(
    switchMap((chainName) => {
      const { client, typedApi } = createChainClient(chainName)
      return from([{ client, typedApi, chainName }])
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