import { useState, useEffect, createContext, useContext } from "react"
import type { InjectedPolkadotAccount } from "@/features/wallet-connect/pjs-signer/types"

interface WalletContextType {
  selectedAccount: InjectedPolkadotAccount | null
  isConnected: boolean
  allAccounts: InjectedPolkadotAccount[]
  setSelectedAccount: (account: InjectedPolkadotAccount | null) => void
}

export const WalletContext = createContext<WalletContextType | null>(null)

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    // Fallback implementation for direct usage
    const [selectedAccount, setSelectedAccount] = useState<InjectedPolkadotAccount | null>(null)
    const [polkadotJSAccounts, setPolkadotJSAccounts] = useState<InjectedPolkadotAccount[]>([])
    const [walletConnectAccounts, setWalletConnectAccounts] = useState<InjectedPolkadotAccount[]>([])

    // Load Polkadot JS accounts
    useEffect(() => {
      const loadPolkadotJSAccounts = async () => {
        if (typeof window === 'undefined') return
        
        try {
          const injectedWeb3 = (window as any).injectedWeb3
          if (!injectedWeb3?.['polkadot-js']) return

          const { web3Accounts, web3Enable } = await import('@polkadot/extension-dapp')
          
          const extensions = await web3Enable('PolkaVM Bridge')
          if (extensions.length === 0) return

          const accounts = await web3Accounts()
          
          const polkadotAccounts = accounts.map((account: any) => ({
            address: account.address,
            name: account.meta.name || 'Polkadot Account',
            polkadotSigner: null as any,
            genesisHash: account.meta.genesisHash,
            type: account.type as any
          }))
          
          setPolkadotJSAccounts(polkadotAccounts)
        } catch (error) {
          console.error('Failed to load Polkadot JS accounts:', error)
        }
      }

      loadPolkadotJSAccounts()
    }, [])

    // Subscribe to WalletConnect accounts manually
    useEffect(() => {
      let subscription: any
      
      const subscribeToWalletConnect = async () => {
        try {
          const { wcAccounts$ } = await import('@/features/wallet-connect/accounts.state')
          subscription = wcAccounts$.subscribe((accounts) => {
            setWalletConnectAccounts(accounts)
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
    }, [])

    const allAccounts = [...polkadotJSAccounts, ...walletConnectAccounts]
    const isConnected = selectedAccount !== null

    return {
      selectedAccount,
      isConnected,
      allAccounts,
      setSelectedAccount
    }
  }
  return context
}
