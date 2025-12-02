
import { createContext, useContext, useState, ReactNode } from "react"

type NetworkType = "polkadot" | "ethereum" | null

interface WalletNetworkContextType {
  network: NetworkType
  setNetwork: (network: NetworkType) => void
}

const WalletNetworkContext = createContext<WalletNetworkContextType | undefined>(undefined)

export const WalletNetworkProvider = ({ children }: { children: ReactNode }) => {
  const [network, setNetwork] = useState<NetworkType>(null)

  return (
    <WalletNetworkContext.Provider value={{ network, setNetwork }}>
      {children}
    </WalletNetworkContext.Provider>
  )
}

export const useWalletNetwork = () => {
  const context = useContext(WalletNetworkContext)
  if (!context) throw new Error("useWalletNetwork must be used within WalletNetworkProvider")
  return context
}
