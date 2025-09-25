"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Wallet, User } from "lucide-react"
import { AccountSelectDrawer } from "./account-select-drawer"
import { useOpenClose } from "@/hooks/use-open-close"
import type { InjectedPolkadotAccount } from "@/features/wallet-connect/pjs-signer/types"

export function ConnectButton() {
  const { open, close, isOpen } = useOpenClose()
  const [selectedAccount, setSelectedAccount] = useState<InjectedPolkadotAccount | null>(null)
  const [polkadotJSAccounts, setPolkadotJSAccounts] = useState<InjectedPolkadotAccount[]>([])
  const [walletConnectAccounts, setWalletConnectAccounts] = useState<InjectedPolkadotAccount[]>([])

  // Load Polkadot JS accounts on mount
  useEffect(() => {
    const loadPolkadotJSAccounts = async () => {
      if (typeof window === 'undefined') return
      
      try {
        // Check if Polkadot JS extension is available
        const injectedWeb3 = (window as any).injectedWeb3
        if (!injectedWeb3?.['polkadot-js']) return

        const { web3Accounts, web3Enable } = await import('@polkadot/extension-dapp')
        
        // Enable the extension
        const extensions = await web3Enable('PolkaVM Bridge')
        if (extensions.length === 0) return

        // Get accounts
        const accounts = await web3Accounts()
        
        // Convert to InjectedPolkadotAccount format (simplified)
        const polkadotAccounts = accounts.map((account: any) => ({
          address: account.address,
          name: account.meta.name || 'Polkadot Account',
          polkadotSigner: null as any, // TODO: Implement proper signer
          genesisHash: account.meta.genesisHash,
          type: account.type as any
        }))
        
        setPolkadotJSAccounts(polkadotAccounts)
        
        // Auto-select first account if none selected
        if (!selectedAccount && polkadotAccounts.length > 0) {
          setSelectedAccount(polkadotAccounts[0])
        }
      } catch (error) {
        console.error('Failed to load Polkadot JS accounts:', error)
      }
    }

      loadPolkadotJSAccounts()
    }, [selectedAccount])

  // Subscribe to WalletConnect accounts
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

  // Auto-select from accounts if available
  useEffect(() => {
    if (!selectedAccount) {
      if (polkadotJSAccounts.length > 0) {
        setSelectedAccount(polkadotJSAccounts[0])
      } else if (walletConnectAccounts.length > 0) {
        setSelectedAccount(walletConnectAccounts[0])
      }
    }
  }, [walletConnectAccounts, polkadotJSAccounts, selectedAccount])

  const allAccounts = [...polkadotJSAccounts, ...walletConnectAccounts]
  const isConnected = selectedAccount !== null

  const handleAccountSelect = (account: InjectedPolkadotAccount) => {
    setSelectedAccount(account)
    close()
  }

  const shortenAddress = (address: string, chars = 4) => {
    return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
  }

  const disconnect = () => {
    setSelectedAccount(null)
  }

  return (
    <>
      {isConnected ? (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={open}
            className="flex items-center gap-2"
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">{selectedAccount.name}</span>
            <span className="font-mono text-xs">
              {shortenAddress(selectedAccount.address)}
            </span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={disconnect}
            className="text-muted-foreground hover:text-foreground"
          >
            Disconnect
          </Button>
        </div>
      ) : (
        <Button
          onClick={open}
          className="flex items-center gap-2"
        >
          <Wallet className="w-4 h-4" />
          Connect Wallet
        </Button>
      )}

      <AccountSelectDrawer
        title="Connect Wallet"
        isOpen={isOpen}
        onDismiss={close}
        ownedOnly
        onAccountSelect={handleAccountSelect}
      />
    </>
  )
}
