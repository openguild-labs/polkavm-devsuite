import { useState, useEffect, createContext, useContext } from "react"
import type { InjectedPolkadotAccount } from "@/features/wallet-connect/pjs-signer/types"

interface WalletContextType {
  selectedAccount: InjectedPolkadotAccount | null
  isConnected: boolean
  allAccounts: InjectedPolkadotAccount[]
  setSelectedAccount: (account: InjectedPolkadotAccount | null) => void
  disconnect: () => Promise<void>
}

export const WalletContext = createContext<WalletContextType | null>(null)

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    // Fallback implementation for direct usage
    const [selectedAccount, setSelectedAccount] = useState<InjectedPolkadotAccount | null>(null)
    const [polkadotJSAccounts, setPolkadotJSAccounts] = useState<InjectedPolkadotAccount[]>([])
    const [walletConnectAccounts, setWalletConnectAccounts] = useState<InjectedPolkadotAccount[]>([])
    const [isDisconnecting, setIsDisconnecting] = useState(false)

    // Subscribe to WalletConnect accounts for existing sessions only
    useEffect(() => {
      let subscription: any
      
      const subscribeToWalletConnect = async () => {
        try {
          const { wcAccounts$ } = await import('@/features/wallet-connect/accounts.state')
          subscription = wcAccounts$.subscribe((accounts) => {
            setWalletConnectAccounts(accounts)
            // Auto-select first WalletConnect account if no account selected
            if (!selectedAccount && accounts.length > 0) {
              setSelectedAccount(accounts[0])
            }
          })
        } catch (error) {
          console.error('Failed to subscribe to WalletConnect accounts:', error)
        }
      }

      subscribeToWalletConnect()

      return () => {
        if (subscription) {
          subscription.unsubscribe()
        }
      }
    }, [selectedAccount])

    const allAccounts = [...polkadotJSAccounts, ...walletConnectAccounts]
    const isConnected = selectedAccount !== null

    const disconnect = async () => {
      setIsDisconnecting(true)
      
      try {
        // Clear local selected account
        setSelectedAccount(null)
        
        // Clear all local accounts state
        setPolkadotJSAccounts([])
        setWalletConnectAccounts([])
        
        // Disconnect from WalletConnect if connected
        try {
          const { walletConnect } = await import('@/features/wallet-connect')
          await walletConnect.disconnect()
          console.log('WalletConnect disconnected successfully')
        } catch (error) {
          console.log('No active WalletConnect session to disconnect:', error)
        }
      } finally {
        setIsDisconnecting(false)
      }
    }

    return {
      selectedAccount,
      isConnected,
      allAccounts,
      setSelectedAccount,
      disconnect
    }
  }
  return context
}
