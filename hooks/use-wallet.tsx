"use client"

import React, { useState, useEffect, createContext, useContext, ReactNode } from "react"
import type { InjectedPolkadotAccount } from "@/features/wallet-connect/pjs-signer/types"

interface WalletContextType {
  selectedAccount: InjectedPolkadotAccount | null
  isConnected: boolean
  allAccounts: InjectedPolkadotAccount[]
  setSelectedAccount: (account: InjectedPolkadotAccount | null) => void
  disconnect: () => Promise<void>
}

export const WalletContext = createContext<WalletContextType | null>(null)

interface WalletProviderProps {
  children: ReactNode
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [selectedAccount, setSelectedAccount] = useState<InjectedPolkadotAccount | null>(null)
  const [polkadotJSAccounts, setPolkadotJSAccounts] = useState<InjectedPolkadotAccount[]>([])
  const [walletConnectAccounts, setWalletConnectAccounts] = useState<InjectedPolkadotAccount[]>([])
  const [isDisconnecting, setIsDisconnecting] = useState(false)

  console.log('🔗 WalletProvider state:', {
    selectedAccount: selectedAccount?.address,
    polkadotJSCount: polkadotJSAccounts.length,
    walletConnectCount: walletConnectAccounts.length
  })

  // Subscribe to WalletConnect accounts for existing sessions only
  useEffect(() => {
    let subscription: any
    
    const subscribeToWalletConnect = async () => {
      try {
        const { wcAccounts$ } = await import('@/features/wallet-connect/accounts.state')
        subscription = wcAccounts$.subscribe((accounts) => {
          console.log('💰 WalletConnect accounts updated:', accounts.length)
          setWalletConnectAccounts(accounts)
          // Auto-select first WalletConnect account if no account selected
          if (!selectedAccount && accounts.length > 0) {
            console.log('🎯 Auto-selecting first WalletConnect account:', accounts[0].address)
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
    console.log('🔌 Disconnecting wallet...')
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

  // Enhanced setSelectedAccount with logging
  const enhancedSetSelectedAccount = (account: InjectedPolkadotAccount | null) => {
    console.log('🏦 WalletProvider: Setting account:', {
      address: account?.address || 'null',
      hasSigner: !!account?.polkadotSigner,
      signerType: account?.polkadotSigner ? typeof account.polkadotSigner : 'null',
      walletName: account?.walletName || 'unknown'
    })
    setSelectedAccount(account)
  }

  const contextValue: WalletContextType = {
    selectedAccount,
    isConnected,
    allAccounts,
    setSelectedAccount: enhancedSetSelectedAccount,
    disconnect
  }

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  )
}

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
