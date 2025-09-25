"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Wallet, Copy, Check } from "lucide-react"
import type { InjectedPolkadotAccount } from "@/features/wallet-connect/pjs-signer/types"

interface AccountSelectDrawerProps {
  title: string
  isOpen: boolean
  onDismiss: () => void
  ownedOnly?: boolean
  onAccountSelect?: (account: InjectedPolkadotAccount) => void
}

export function AccountSelectDrawer({
  title,
  isOpen,
  onDismiss,
  ownedOnly = false,
  onAccountSelect
}: AccountSelectDrawerProps) {
  const [selectedAccount, setSelectedAccount] = useState<InjectedPolkadotAccount | null>(null)
  const [polkadotJSAccounts, setPolkadotJSAccounts] = useState<InjectedPolkadotAccount[]>([])
  const [walletConnectAccounts, setWalletConnectAccounts] = useState<InjectedPolkadotAccount[]>([])
  const [isConnecting, setIsConnecting] = useState<string | null>(null)
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)

  // Load Polkadot JS accounts
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
      } catch (error) {
        console.error('Failed to load Polkadot JS accounts:', error)
      }
    }

    if (isOpen) {
      loadPolkadotJSAccounts()
    }
  }, [isOpen])

  // Subscribe to WalletConnect accounts
  useEffect(() => {
    let subscription: any
    
    const subscribeToWalletConnect = async () => {
      if (!isOpen) return
      
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
  }, [isOpen])

  const connectWalletConnect = async () => {
    setIsConnecting('walletconnect')
    try {
      const { walletConnect } = await import('@/features/wallet-connect')
      await walletConnect.connect()
    } catch (error) {
      console.error('Failed to connect WalletConnect:', error)
    } finally {
      setIsConnecting(null)
    }
  }

  const copyAddress = async (address: string) => {
    await navigator.clipboard.writeText(address)
    setCopiedAddress(address)
    setTimeout(() => setCopiedAddress(null), 2000)
  }

  const shortenAddress = (address: string, chars = 4) => {
    return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
  }

  const allAccounts = [...polkadotJSAccounts, ...walletConnectAccounts]

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onDismiss()}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>
            Connect your wallet to start bridging tokens
          </DrawerDescription>
        </DrawerHeader>
        
        <div className="p-4 space-y-4">
          {/* Available Wallets */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Available Wallets</h3>
            
            {/* Polkadot JS Extension */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                    P
                  </div>
                  <div>
                    <div className="font-medium">Polkadot{'{.js}'}</div>
                    <div className="text-xs text-muted-foreground">
                      {polkadotJSAccounts.length > 0 
                        ? `${polkadotJSAccounts.length} account(s) found`
                        : 'Browser extension'
                      }
                    </div>
                  </div>
                </div>
                {polkadotJSAccounts.length === 0 && (
                  <Badge variant="outline" className="text-xs">
                    Not installed
                  </Badge>
                )}
              </div>
            </Card>

            {/* WalletConnect */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    W
                  </div>
                  <div>
                    <div className="font-medium">WalletConnect</div>
                    <div className="text-xs text-muted-foreground">
                      {walletConnectAccounts.length > 0 
                        ? `${walletConnectAccounts.length} account(s) connected`
                        : 'Connect via QR code'
                      }
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={connectWalletConnect}
                  disabled={isConnecting === 'walletconnect'}
                  className="ml-2"
                >
                  {isConnecting === 'walletconnect' ? 'Connecting...' : 'Connect'}
                </Button>
              </div>
            </Card>
          </div>

          {/* Connected Accounts */}
          {allAccounts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Connected Accounts</h3>
              
              {allAccounts.map((account, index) => (
                <Card 
                  key={`${account.address}-${index}`}
                  className={`p-4 cursor-pointer transition-colors hover:bg-secondary/50 ${
                    selectedAccount?.address === account.address ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => {
                    setSelectedAccount(account)
                    onAccountSelect?.(account)
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">
                        <Wallet className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-medium">{account.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {shortenAddress(account.address)}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        copyAddress(account.address)
                      }}
                    >
                      {copiedAddress === account.address ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {allAccounts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No wallets connected</p>
              <p className="text-sm">Connect a wallet to get started</p>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
