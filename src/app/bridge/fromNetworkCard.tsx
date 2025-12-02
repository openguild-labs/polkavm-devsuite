"use client"

import { useWalletNetwork } from "@/context/WalletContext"
import { Card } from "@/components/ui/card"

export function FromNetworkCard() {
  const { network: connectedNetwork } = useWalletNetwork()

  const fromNetwork = (() => {
    if (connectedNetwork === "polkadot") return {
      id: "paseoPassetHub",
      name: "Polkadot Hub",
      symbol: "P-HUB",
      chainIconUrl: "/wallets/polkadot.svg"
    }
    if (connectedNetwork === "ethereum") return {
      id: "ethereumHub",
      name: "Ethereum Hub",
      symbol: "ETH-HUB",
      chainIconUrl: "/wallets/ethereum.svg"
    }
    return null
  })()

  if (!fromNetwork) return null

  return (
    <Card className="p-4 bg-secondary/50 border-border/50">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
          <img
            src={fromNetwork.chainIconUrl}
            alt={fromNetwork.name}
            className="w-8 h-8 object-contain"
          />
        </div>
        <div className="flex-1">
          <div className="font-medium">{fromNetwork.name}</div>
          <div className="text-xs text-muted-foreground">{fromNetwork.symbol}</div>
        </div>
      </div>
    </Card>
  )
}
