"use client"

import { useWalletNetwork } from "@/context/WalletContext"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Check, ChevronDown } from "lucide-react"

import { useState, useEffect } from "react"
import { FROM_NETWORKS, TO_NETWORKS } from "@/constants"

interface NetworkDropdownProps {
  isReversed?: boolean
  onSelect: (network: typeof TO_NETWORKS[0]) => void
}

export function ToNetworkDropdown({ isReversed, onSelect }: NetworkDropdownProps) {
  const { network: connectedNetwork } = useWalletNetwork()
  const [toNetwork, setToNetwork] = useState(TO_NETWORKS[0])

  useEffect(() => {
    if (connectedNetwork === "polkadot") {
      const polkadotTo = TO_NETWORKS.find((n) => n.id === "passet") 
      if (polkadotTo) setToNetwork(polkadotTo)
    } else if (connectedNetwork === "ethereum") {
      const ethTo = TO_NETWORKS.find((n) => n.id === "wah") 
      if (ethTo) setToNetwork(ethTo)
    }
  }, [connectedNetwork])

  const handleToNetworkSelect = (networkItem: typeof TO_NETWORKS[0]) => {
    setToNetwork(networkItem)
    onSelect(networkItem)
  }

  return (
    <Card className="p-4 bg-secondary/50 border-border/50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex items-center gap-3 cursor-pointer hover:bg-secondary/70 transition-colors rounded-md p-2 -m-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
              <img
                src={toNetwork.chainIconUrl}
                alt={toNetwork.name}
                className="w-8 h-8 object-contain"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement
                  target.style.display = "none"
                  const nextElement = target.nextElementSibling as HTMLElement
                  if (nextElement) nextElement.style.display = "flex"
                }}
              />
            </div>
            <div className="flex-1">
              <div className="font-medium">{toNetwork.name}</div>
              <div className="text-xs text-muted-foreground">{toNetwork.symbol}</div>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80">
          <ScrollArea className="h-64">
            {(isReversed ? FROM_NETWORKS : TO_NETWORKS).map((networkItem) => (
              <DropdownMenuItem
                key={networkItem.id}
                onClick={() => handleToNetworkSelect(networkItem)}
                className="flex items-center gap-3 p-3 cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                  <img
                    src={networkItem.chainIconUrl}
                    alt={networkItem.name}
                    className="w-8 h-8 object-contain"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement
                      target.style.display = "none"
                      const nextElement = target.nextElementSibling as HTMLElement
                      if (nextElement) nextElement.style.display = "flex"
                    }}
                  />
                </div>
                <div className="flex-1">
                  <div className="font-medium">{networkItem.name}</div>
                  <div className="text-xs text-muted-foreground">{networkItem.symbol}</div>
                </div>
                {networkItem.id === toNetwork.id && <Check className="w-4 h-4 text-primary" />}
              </DropdownMenuItem>
            ))}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>
    </Card>
  )
}
