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
import type { InjectedPolkadotAccount, SignPayload, SignRaw } from "@/features/wallet-connect/pjs-signer/types"
import { detectPolkadotWallets, externalWallets, type WalletInfo } from "@/lib/wallet-detection"
import { chainClient$, selectedChain$ } from "@/lib/chain"
import { supportedChains, type SupportedChain } from "@/lib/chains"
import { useStateObservable } from "@react-rxjs/core"
import { toast } from "sonner"

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
  const [detectedWallets, setDetectedWallets] = useState<WalletInfo[]>([])
  const [availableExternalWallets] = useState<WalletInfo[]>(externalWallets)
  const [accountBalances, setAccountBalances] = useState<Map<string, bigint>>(new Map())
  const [loadingBalances, setLoadingBalances] = useState<Set<string>>(new Set())
  
  // Get chain client and API
  const chainClient = useStateObservable(chainClient$)
  const [selectedChain, setSelectedChain] = useState<SupportedChain>("wah")
  
  // Subscribe to selected chain changes
  useEffect(() => {
    const subscription = selectedChain$.subscribe(setSelectedChain)
    return () => subscription.unsubscribe()
  }, [])

  // Function to fetch balance for a specific address
  const fetchBalance = async (address: string) => {
    if (!chainClient?.typedApi) {
      console.warn('Chain client not available for balance fetching')
      return
    }

    try {
      setLoadingBalances(prev => new Set(prev).add(address))
      
      console.log(`Fetching balance for ${address}...`)
      const account = await chainClient.typedApi.query.System.Account.getValue(address)
      const balance = account.data.free
      
      console.log(`Balance for ${address}:`, balance.toString())
      
      setAccountBalances(prev => new Map(prev).set(address, balance))
    } catch (error) {
      console.error(`Failed to fetch balance for ${address}:`, error)
    } finally {
      setLoadingBalances(prev => {
        const newSet = new Set(prev)
        newSet.delete(address)
        return newSet
      })
    }
  }

  // Function to format balance for display
  const formatBalance = (balance: bigint): string => {
    // Get the current network configuration
    const networkConfig = supportedChains[selectedChain]
    if (!networkConfig) {
      console.warn('No network configuration found for selected chain:', selectedChain)
      return `${Number(balance) / 1e10} DOT`
    }
    
    // Convert from smallest unit (planck) to native token using correct decimals
    const divisor = 10n ** BigInt(networkConfig.decimals)
    const formatted = Number(balance) / Number(divisor)
    
    // Format to 4 decimal places and add correct symbol
    return `${formatted.toFixed(4)} ${networkConfig.symbol}`
  }

  // Detect available wallets when drawer opens
  useEffect(() => {
    if (isOpen) {
      const wallets = detectPolkadotWallets()
      setDetectedWallets(wallets)
      console.log('Available wallets:', wallets)
      
      const injectedWeb3 = (window as any).injectedWeb3 || {}
      console.log('Injected Web3:', injectedWeb3)
      console.log('Injected Web3 keys:', Object.keys(injectedWeb3))
      
      // Diagnostic: Check which wallets are actually installed
      const installedWallets = wallets.filter(w => w.isInstalled)
      console.log('Detected installed wallets:', installedWallets.map(w => `${w.displayName} (${w.id})`))
      
      if (installedWallets.length === 0) {
        console.warn('No Polkadot wallets detected! Make sure you have at least one wallet extension installed.')
      }
    } else {
      setDetectedWallets([])
    }
  }, [isOpen])

  // Fetch balances when accounts are loaded and chain client is available
  useEffect(() => {
    if (!chainClient?.typedApi) return
    
    const allAccounts = [...polkadotJSAccounts, ...walletConnectAccounts]
    
    // Fetch balances for all connected accounts
    allAccounts.forEach(account => {
      if (!accountBalances.has(account.address) && !loadingBalances.has(account.address)) {
        fetchBalance(account.address)
      }
    })
  }, [polkadotJSAccounts, walletConnectAccounts, chainClient, accountBalances, loadingBalances])

  // Refetch balances when network changes
  useEffect(() => {
    if (!chainClient?.typedApi) return
    
    const allAccounts = [...polkadotJSAccounts, ...walletConnectAccounts]
    
    // Clear existing balances and refetch with new network
    setAccountBalances(new Map())
    allAccounts.forEach(account => {
      fetchBalance(account.address)
    })
  }, [selectedChain])

  // Load Polkadot JS accounts only when drawer opens
  useEffect(() => {
    const loadPolkadotJSAccounts = async () => {
      if (typeof window === 'undefined' || !isOpen) return
      
      try {
        // Check if Polkadot JS extension is available
        const injectedWeb3 = (window as any).injectedWeb3
        if (!injectedWeb3?.['polkadot-js']) {
          setPolkadotJSAccounts([])
          return
        }

        const { web3Accounts, web3Enable } = await import('@polkadot/extension-dapp')
        
        // Enable the extension
        const extensions = await web3Enable('PolkaVM Bridge')
        if (extensions.length === 0) {
          setPolkadotJSAccounts([])
          return
        }

        // Get accounts
        const accounts = await web3Accounts()
        
         // Convert to InjectedPolkadotAccount format with proper signers
         const { web3FromSource } = await import('@polkadot/extension-dapp')
         const { getPolkadotSignerFromPjs } = await import('@/features/wallet-connect/pjs-signer/from-pjs-account')
         
         const polkadotAccounts = (await Promise.all(accounts.map(async (account: any) => {
           // Get signer for each account and convert to polkadot-api compatible format
           let polkadotApiSigner = null
           try {
             const injector = await web3FromSource(account.meta.source)
             
             if (injector?.signer && injector.signer.signPayload && injector.signer.signRaw) {

               polkadotApiSigner = getPolkadotSignerFromPjs(
                 account.address,
                 injector.signer.signPayload.bind(injector.signer) as SignPayload,
                 injector.signer.signRaw.bind(injector.signer) as SignRaw
               )
               console.log(`✅ Converted PJS signer to polkadot-api format for account ${account.address} from ${account.meta.source}`)
             } else {
               console.error(`❌ No valid signer found for account ${account.address} from ${account.meta.source}`)
               return null // Skip this account
             }
           } catch (error) {
             console.error(`❌ Failed to get and convert signer for account ${account.address}:`, error)
             return null // Skip this account
           }
           
           return {
             address: account.address,
             name: account.meta.name,
             polkadotSigner: polkadotApiSigner, // Now this is a proper polkadot-api compatible signer
             genesisHash: account.meta.genesisHash,
             type: account.type as any,
             walletId: account.meta.source,
             walletName: account.meta.source === 'polkadot-js' ? 'Polkadot{.js}' : account.meta.source
           } as InjectedPolkadotAccount
         }))).filter(account => account !== null) as InjectedPolkadotAccount[]
        
        setPolkadotJSAccounts(polkadotAccounts)
      } catch (error) {
        console.error('Failed to load Polkadot JS accounts:', error)
        setPolkadotJSAccounts([])
      }
    }

    // Only load when drawer is opened
    if (isOpen) {
      loadPolkadotJSAccounts()
    } else {
      // Clear accounts when drawer closes
      setPolkadotJSAccounts([])
    }
  }, [isOpen])

  // Subscribe to WalletConnect accounts only when drawer is open
  useEffect(() => {
    let subscription: any
    
    const subscribeToWalletConnect = async () => {
      if (!isOpen) {
        setWalletConnectAccounts([])
        return
      }
      
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
      if (!isOpen) {
        setWalletConnectAccounts([])
      }
    }
  }, [isOpen])

  const connectToWallet = async (wallet: WalletInfo) => {
    setIsConnecting(wallet.id)
    try {
      console.log(`Attempting to connect to ${wallet.displayName}`)
      
      // Get the specific wallet extension directly from injectedWeb3
      const injectedWeb3 = (window as any).injectedWeb3 || {}
      const walletExtension = injectedWeb3[wallet.id]
      
      if (!walletExtension) {
        throw new Error(`${wallet.displayName} extension not found. Please make sure it's installed.`)
      }

      console.log(`Found ${wallet.displayName} extension:`, walletExtension)

      console.log(`Enabling only ${wallet.displayName}...`)
      await walletExtension.enable('PolkaVM Bridge')
      console.log(`Successfully enabled ${wallet.displayName}`)

      // Get accounts directly from this wallet extension
      console.log(`Getting accounts from ${wallet.displayName}...`)
      console.log(`Wallet extension structure:`, walletExtension)
      
      let accounts = []
      
      // Try different methods to get accounts based on wallet extension API
      if (walletExtension.accounts && typeof walletExtension.accounts.get === 'function') {
        // Standard method
        accounts = await walletExtension.accounts.get()
      } else if (typeof walletExtension.getAccounts === 'function') {
        // Alternative method
        accounts = await walletExtension.getAccounts()
      } else {
        // Fallback: use web3Accounts but filter by source
        console.log(`No direct account access method found, using web3Accounts fallback...`)
        const { web3Accounts } = await import('@polkadot/extension-dapp')
        const allAccounts = await web3Accounts()
        accounts = allAccounts.filter(acc => acc.meta?.source === wallet.id)
      }
      
      console.log(`Found ${accounts.length} accounts from ${wallet.displayName}:`, accounts)
      
      if (accounts.length === 0) {
        throw new Error(`No accounts found in ${wallet.displayName}. Please make sure you have accounts in this wallet and it's unlocked.`)
      }

      // Convert accounts to our format and resolve signer for each
      const polkadotAccounts = await Promise.all(accounts.map(async (account: any) => {
        // Get the proper signer for this specific account
        let pjsSigner = null
        
        // Try wallet extension signer first
        if (walletExtension.signer) {
          pjsSigner = walletExtension.signer
          console.log(`Using wallet extension signer for ${account.address}`)
        } else {
          // Fallback: get signer using web3FromSource
          try {
            const { web3FromSource } = await import('@polkadot/extension-dapp')
            const injector = await web3FromSource(wallet.id)
            pjsSigner = injector.signer
            console.log(`Using web3FromSource signer for ${account.address}`)
          } catch (signerError) {
            console.warn(`Could not get signer for ${wallet.displayName} account ${account.address}:`, signerError)
          }
        }

        let polkadotApiSigner = null
        if (pjsSigner && pjsSigner.signPayload && pjsSigner.signRaw) {
          const { getPolkadotSignerFromPjs } = await import('@/features/wallet-connect/pjs-signer/from-pjs-account')
          polkadotApiSigner = getPolkadotSignerFromPjs(
            account.address,
            pjsSigner.signPayload.bind(pjsSigner) as SignPayload,
            pjsSigner.signRaw.bind(pjsSigner) as SignRaw
          )
          console.log(`Successfully resolved signer for account ${account.address}`)
        } else {
          console.error(`No signer available for account ${account.address} from ${wallet.displayName}`)
        }

        return {
          address: account.address,
          name: account.meta?.name || account.name || `${wallet.displayName} Account`,
          polkadotSigner: polkadotApiSigner,
          genesisHash: account.meta?.genesisHash || account.genesisHash,
          type: account.type,
          walletId: wallet.id,
          walletName: wallet.displayName
        }
      }))
      
      setPolkadotJSAccounts(polkadotAccounts)
      console.log(`Successfully connected to ${wallet.displayName}:`, polkadotAccounts)
      
      // Show success toast
      toast.success(`Connected to ${wallet.displayName}`, {
        description: `Found ${polkadotAccounts.length} account(s)`
      })
      
    } catch (error) {
      console.error(`Failed to connect ${wallet.displayName}:`, error)
      // Show user-friendly error toast
      toast.error(`Failed to connect to ${wallet.displayName}`, {
        description: error instanceof Error ? error.message : 'Please make sure the extension is unlocked and has accounts.'
      })
    } finally {
      setIsConnecting(null)
    }
  }

  const connectToExternalWallet = async (wallet: WalletInfo) => {
    setIsConnecting(wallet.id)
    try {
      if (wallet.id === 'wallet-connect') {
        const { walletConnect } = await import('@/features/wallet-connect')
        await walletConnect.connect()
      }
    } catch (error) {
      console.error(`Failed to connect ${wallet.displayName}:`, error)
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
          
          {/* Debug info for troubleshooting */}
          {detectedWallets.filter(w => w.isInstalled).length === 0 && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              ⚠️ No wallets detected. Please install a Polkadot wallet extension first.
            </div>
          )}
        </DrawerHeader>
        
        <div className="p-4 space-y-4">
          {/* Installed Wallets */}
          {detectedWallets.filter(w => w.isInstalled).length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Installed wallets</h3>
              
              {detectedWallets.filter(w => w.isInstalled).map((wallet) => (
                <Card 
                  key={wallet.id} 
                  className={`p-4 cursor-pointer hover:bg-secondary/50 ${isConnecting === wallet.id ? 'opacity-50' : ''}`} 
                  onClick={() => isConnecting !== wallet.id && connectToWallet(wallet)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden">
                        <img 
                          src={wallet.icon} 
                          alt={wallet.displayName}
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            // Fallback to a default icon if image fails to load
                            e.currentTarget.style.display = 'none'
                            e.currentTarget.nextElementSibling!.style.display = 'flex'
                          }}
                        />
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 hidden">
                          {wallet.displayName[0]}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium">{wallet.displayName}</div>
                        <div className="text-xs text-muted-foreground">
                          {isConnecting === wallet.id ? 'Connecting...' : wallet.description}
                        </div>
                      </div>
                    </div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* External Wallets */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">External wallets</h3>
            
            {availableExternalWallets.map((wallet) => (
              <Card 
                key={wallet.id} 
                className={`p-4 cursor-pointer hover:bg-secondary/50 ${isConnecting === wallet.id ? 'opacity-50' : ''}`} 
                onClick={() => isConnecting !== wallet.id && connectToExternalWallet(wallet)}
              >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden">
                        <img 
                          src={wallet.icon} 
                          alt={wallet.displayName}
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            // Fallback to a default icon if image fails to load
                            e.currentTarget.style.display = 'none'
                            e.currentTarget.nextElementSibling!.style.display = 'flex'
                          }}
                        />
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 hidden">
                          {wallet.displayName[0]}
                        </div>
                      </div>
                    <div>
                      <div className="font-medium">{wallet.displayName}</div>
                      <div className="text-xs text-muted-foreground">
                        {isConnecting === wallet.id 
                          ? 'Connecting...'
                          : walletConnectAccounts.length > 0 
                            ? `${walletConnectAccounts.length} account(s) connected`
                            : wallet.description
                        }
                      </div>
                    </div>
                  </div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
              </Card>
            ))}
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
                  onClick={async () => {
                    console.log('🔄 Selecting account:', account.address, 'with signer:', !!account.polkadotSigner)
                    
                    // Ensure account has a valid signer before selection
                    let accountWithSigner = account
                    if (!account.polkadotSigner && account.walletId) {
                      console.log('🔧 Account missing signer, attempting to resolve...')
                      try {
                        const { web3FromSource } = await import('@polkadot/extension-dapp')
                        const injector = await web3FromSource(account.walletId)
                        if (injector.signer && injector.signer.signPayload && injector.signer.signRaw) {
                          const { getPolkadotSignerFromPjs } = await import('@/features/wallet-connect/pjs-signer/from-pjs-account')
                          const polkadotApiSigner = getPolkadotSignerFromPjs(
                            account.address,
                            injector.signer.signPayload.bind(injector.signer) as SignPayload,
                            injector.signer.signRaw.bind(injector.signer) as SignRaw
                          )
                          accountWithSigner = {
                            ...account,
                            polkadotSigner: polkadotApiSigner
                          }
                          console.log('✅ Signer resolved for account:', account.address)
                        } else {
                          throw new Error('No valid signer found in injector')
                        }
                      } catch (error) {
                        console.error('❌ Failed to resolve signer:', error)
                        toast.error('Failed to get wallet signer. Please try reconnecting.')
                        return
                      }
                    }
                    
                    setSelectedAccount(accountWithSigner)
                    onAccountSelect?.(accountWithSigner)
                    // Close drawer after selection
                    onDismiss()
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
                        {account.walletName && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            via {account.walletName}
                            {account.polkadotSigner ? (
                              <span className="text-green-500" title="Signer available">✓</span>
                            ) : (
                              <span className="text-red-500" title="No signer">⚠</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Balance Display */}
                      <div className="text-right mr-2">
                        {loadingBalances.has(account.address) ? (
                          <div className="text-sm text-muted-foreground">Loading...</div>
                        ) : accountBalances.has(account.address) ? (
                          <div className="text-sm font-medium">
                            {formatBalance(accountBalances.get(account.address)!)}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">-</div>
                        )}
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
