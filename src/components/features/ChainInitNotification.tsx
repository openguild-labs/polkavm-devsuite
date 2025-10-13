"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useLightClient, supportedChains, type SupportedChain } from "@/lib/chains"
import { createChainClient } from "@/lib/chain"

const waitChainReady = async (chainName: SupportedChain) => {
  console.log(`🔧 ChainInitNotification: Creating chain client for ${chainName}...`)
  const { client } = await createChainClient(chainName)
  console.log(`✅ ChainInitNotification: Chain client created for ${chainName}`)
  
  // Wait for first finalized block to ensure chain is ready
  await new Promise((resolve) => {
    const subscription = client.finalizedBlock$.subscribe(() => {
      subscription.unsubscribe()
      console.log(`✅ ChainInitNotification: ${chainName} is ready`)
      resolve(void 0)
    })
  })
}

export function ChainInitNotification() {
  const [isClient, setIsClient] = useState(false)
  const [isLightClient, setIsLightClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    setIsLightClient(useLightClient())
  }, [])

  useEffect(() => {
    if (!isClient) return
    const chainNames = Object.keys(supportedChains) as SupportedChain[]
    
    // Create promises for all supported chains
    const chainPromises = chainNames.map(chainName => waitChainReady(chainName))
    const allChainsReady = Promise.all(chainPromises)
    
    // Race condition: either all chains load quickly or we show loading toast
    const racePromise = Promise.race([
      allChainsReady,
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 500))
    ])

    const toastId = "chain-init"

    racePromise.then((isLoaded) => {
      if (!isLoaded) {
        toast.loading(
          <div className="space-y-1">
            <div className="font-medium">
              {isLightClient ? "Synchronizing light clients" : "Connecting to networks"}
            </div>
            <div className="text-sm text-muted-foreground">
              {isLightClient 
                ? "Initializing connections to all supported chains. This may take some time..."
                : "Establishing RPC connections to all networks"
              }
            </div>
          </div>,
          { 
            id: toastId,
            duration: Infinity
          }
        )

        allChainsReady.then(() => {
          toast.dismiss(toastId)
          toast.success(
            <div className="space-y-1">
              <div className="font-medium">Networks ready</div>
              <div className="text-sm text-muted-foreground">
                All {chainNames.length} supported chains are now available
              </div>
            </div>,
            { duration: 3000 }
          )
        }).catch((error) => {
          toast.dismiss(toastId)
          toast.error(
            <div className="space-y-1">
              <div className="font-medium">Connection failed</div>
              <div className="text-sm text-muted-foreground">
                Failed to initialize some networks. Please check your connection.
              </div>
            </div>,
            { duration: 5000 }
          )
          console.error("Chain initialization failed:", error)
        })
      }
    })

    return () => {
      toast.dismiss(toastId)
    }
  }, [isClient, isLightClient])

  return null
}
