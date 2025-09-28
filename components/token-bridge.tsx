"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown, Wallet, ChevronDown, Zap, Clock, Copy, Check } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  supportedChains,
  supportedPolkaVMChains,
  type SupportedChain,
  type SupportedPolkaVMChain,
  getChainConfig,
  getPolkaVMChainConfig
} from "@/lib/chains"
import { ConnectButton } from "./connect-button"
import { useWallet } from "@/hooks/use-wallet"
import { chainClient$, switchToChain } from "@/lib/chain"
import { useStateObservable } from "@react-rxjs/core"
import { toast } from "sonner"
import { Binary } from "polkadot-api"
import { catchError, of, shareReplay } from "rxjs"


import { getPolkadotSignerFromPjs } from "@/features/wallet-connect/pjs-signer/from-pjs-account"
import type { SignPayload, SignRaw } from "@/features/wallet-connect/pjs-signer/types"

// Helper function to get a compatible signer
async function getCompatibleSigner(account: any, chainClient: any) {
  console.log('🔍 Getting signer for account:', account.address)
  
  // The account should already have a properly converted polkadot-api compatible signer
  if (account.polkadotSigner) {
    console.log('✅ Using account polkadotSigner (already converted to polkadot-api format)')
    return account.polkadotSigner
  }

  // Fallback: Try to create a signer using the chain client
  if (chainClient?.client && typeof chainClient.client.getPolkadotSigner === 'function') {
    console.log('🔄 Trying chain client getPolkadotSigner as fallback...')
    try {
      const signer = chainClient.client.getPolkadotSigner(account.address)
      console.log('✅ Chain client signer created successfully')
      return signer
    } catch (error) {
      console.log('❌ Chain client signer failed:', error)
    }
  }

  // If no signer is available, throw an error
  throw new Error('No compatible signer found. Please reconnect your wallet.')
}

// Color mapping for network icons
const networkColors: Record<string, string> = {
  polkadot: "bg-pink-500",
  kusama: "bg-green-500",
  westend: "bg-blue-500",
  paseo: "bg-purple-500",
  paseoah: "bg-orange-500",
  paseoAssetHub: "bg-red-500",
  passet: "bg-purple-600",
  wah: "bg-blue-600"
}

// Convert supportedChains to format expected by UI
const fromNetworks = Object.entries(supportedChains).map(([key, config]) => ({
  id: key as SupportedChain,
  name: config.displayName,
  symbol: config.symbol,
  color: networkColors[key] || "bg-gray-500"
}))

// Convert supportedPolkaVMChains to format expected by UI  
const toNetworks = Object.entries(supportedPolkaVMChains).map(([key, config]) => ({
  id: key as SupportedPolkaVMChain,
  name: config.displayName,
  symbol: config.symbol,
  color: networkColors[key] || "bg-blue-500"
}))

// Token mapping based on network
const getTokensForNetwork = (networkId: string) => {
  switch (networkId) {
    case 'passet':
      return [{ symbol: "PAS", name: "Paseo Token", price: "$" }]
    case 'wah':
      return [{ symbol: "WND", name: "Westend Token", price: "$" }]
    default:
      return [{ symbol: "WND", name: "Westend Token", price: "$" }]
  }
}

export function TokenBridge() {
  const { isConnected, selectedAccount, disconnect } = useWallet()
  const chainClient = useStateObservable(chainClient$)
  const [fromNetwork, setFromNetwork] = useState(fromNetworks[0]) // First supported chain
  const [toNetwork, setToNetwork] = useState(toNetworks[0]) // First supported PolkaVM chain
  const [selectedToken, setSelectedToken] = useState(getTokensForNetwork(fromNetworks[0].id)[0])
  const [amount, setAmount] = useState("")
  const [recipientAddress, setRecipientAddress] = useState("")
  const [addressCopied, setAddressCopied] = useState(false)
  const [accountBalance, setAccountBalance] = useState<string>("0.0000")
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)
  const [isBridging, setIsBridging] = useState(false)
  const [bridgeError, setBridgeError] = useState<string | null>(null)

  // Format balance from planck to human readable
  const formatBalance = (balance: bigint, decimals: number = 10): string => {
    const divisor = BigInt(10 ** decimals)
    const whole = balance / divisor
    const remainder = balance % divisor
    const fractional = Number(remainder) / Number(divisor)
    return `${whole}.${fractional.toFixed(4).slice(2)}`
  }

  // Fetch account balance
  const fetchAccountBalance = async () => {
    console.log('🔍 fetchAccountBalance called with:', {
      selectedAccount: selectedAccount?.address,
      chainClient: !!chainClient,
      typedApi: !!chainClient?.typedApi,
      fromNetwork: fromNetwork.id
    })

    // Check if we can access the chain client from window (development fallback)
    const windowClient = typeof window !== 'undefined' ? (window as any).__PAPI_CLIENT__ : null
    const windowApi = typeof window !== 'undefined' ? (window as any).__PAPI_API__ : null
    console.log('🔍 Window fallback check:', {
      windowClient: !!windowClient,
      windowApi: !!windowApi
    })

    if (!selectedAccount?.address) {
      console.log('❌ No selected account address')
      setAccountBalance("0.0000")
      return
    }

    if (!chainClient?.typedApi && !windowApi) {
      console.log('❌ No chain client or typed API available (neither from chainClient nor window)')
      setAccountBalance("0.0000")
      return
    }

    setIsLoadingBalance(true)
    try {
      console.log(`🔍 Fetching balance for ${selectedAccount.address} on chain ${fromNetwork.id}...`)

      // Check if the address is valid
      if (!selectedAccount.address.startsWith('5') || selectedAccount.address.length !== 48) {
        console.error('❌ Invalid address format:', selectedAccount.address)
        setAccountBalance("0.0000")
        return
      }

      // Use chainClient.typedApi if available, otherwise fallback to window API
      const apiToUse = chainClient?.typedApi || windowApi
      if (!apiToUse) {
        console.error('❌ No API available for balance query')
        setAccountBalance("0.0000")
        return
      }

      console.log('🔍 Using API:', chainClient?.typedApi ? 'chainClient.typedApi' : 'window.__PAPI_API__')

      const account = await apiToUse.query.System.Account.getValue(selectedAccount.address)
      console.log('📊 Raw account data:', account)

      const balance = account.data.free
      console.log('💰 Raw balance (planck):', balance.toString())

      // Get the correct decimals from the network configuration
      const networkConfig = supportedChains[fromNetwork.id]
      const decimals = networkConfig.decimals
      const formattedBalance = formatBalance(balance, decimals)

      setAccountBalance(formattedBalance)
      console.log(`✅ Balance for ${selectedAccount.address}: ${formattedBalance} ${networkConfig.symbol}`)
    } catch (error) {
      console.error('❌ Failed to fetch balance:', error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      setAccountBalance("0.0000")
    } finally {
      setIsLoadingBalance(false)
    }
  }

  // Synchronize fromNetwork with the chainClient
  useEffect(() => {
    console.log(`🔄 Switching to chain: ${fromNetwork.id} (${fromNetwork.name})`)
    switchToChain(fromNetwork.id)
  }, [fromNetwork.id])

  // Fetch balance when account or chain changes
  useEffect(() => {
    console.log('🔄 useEffect triggered for balance fetch:', {
      selectedAccountAddress: selectedAccount?.address,
      hasChainClient: !!chainClient,
      hasTypedApi: !!chainClient?.typedApi,
      fromNetworkId: fromNetwork.id,
      chainClientDetails: chainClient ? {
        client: !!chainClient.client,
        typedApi: !!chainClient.typedApi,
        chainName: chainClient.chainName
      } : null
    })
    fetchAccountBalance()
  }, [selectedAccount?.address, chainClient?.typedApi, fromNetwork.id])

  // Update selected token when from network changes
  useEffect(() => {
    const availableTokens = getTokensForNetwork(fromNetwork.id)
    setSelectedToken(availableTokens[0])
  }, [fromNetwork.id])

  const swapNetworks = () => {
    // Since from and to networks are different types, we'll cycle through available options
    const currentFromIndex = fromNetworks.findIndex(n => n.id === fromNetwork.id)
    const currentToIndex = toNetworks.findIndex(n => n.id === toNetwork.id)

    // Cycle to next available network in each category
    const nextFromIndex = (currentFromIndex + 1) % fromNetworks.length
    const nextToIndex = (currentToIndex + 1) % toNetworks.length

    setFromNetwork(fromNetworks[nextFromIndex])
    setToNetwork(toNetworks[nextToIndex])
  }

  // Network selection handlers
  const handleFromNetworkSelect = (network: typeof fromNetworks[0]) => {
    setFromNetwork(network)
  }

  const handleToNetworkSelect = (network: typeof toNetworks[0]) => {
    setToNetwork(network)
  }

  const copyAddress = async () => {
    if (recipientAddress) {
      await navigator.clipboard.writeText(recipientAddress)
      setAddressCopied(true)
      setTimeout(() => setAddressCopied(false), 2000)
    }
  }

  const isValidEvmAddress = (address: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }

  // Convert amount to planck (native chain units)
  const amountToPlanck = (amount: string, decimals: number = 10): bigint => {
    if (!amount || isNaN(Number(amount))) return BigInt(0)
    const multiplier = BigInt(10 ** decimals)
    const wholePart = BigInt(Math.floor(Number(amount)))
    const fractionalPart = Number(amount) - Number(wholePart)
    const fractionalPlanck = BigInt(Math.floor(fractionalPart * Number(multiplier)))
    return wholePart * multiplier + fractionalPlanck
  }

  // Bridge native tokens to PolkaVM
  const bridgeTokens = async () => {
    if (!selectedAccount?.address || !chainClient?.typedApi || !amount || !recipientAddress) {
      console.error('❌ Missing required data for bridge transaction')
      return
    }

    setIsBridging(true)
    setBridgeError(null)

    try {
      console.log('🌉 Starting bridge transaction...')
      console.log('📋 Transaction details:', {
        from: selectedAccount.address,
        to: recipientAddress,
        amount: amount,
        chainId: fromNetwork.id
      })

      toast.loading('Preparing bridge transaction...', { id: 'bridge-tx' })

      // Validate amount
      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        throw new Error('Invalid amount. Please enter a valid positive number.')
      }

      // Convert amount to planck units (native chain decimals)
      const decimals = fromNetwork.id === 'wah' ? 12 : 10
      const valueInPlanck = amountToPlanck(amount, decimals)
      
      console.log('💰 Amount conversion:', {
        input: amount,
        decimals: decimals,
        planck: valueInPlanck.toString(),
        valueType: typeof valueInPlanck
      })

      // Validate conversion result
      if (valueInPlanck === undefined || valueInPlanck === null) {
        throw new Error('Failed to convert amount to blockchain units.')
      }

      // Prepare revive.call transaction
      const call = chainClient.typedApi.tx.Revive.call({
        dest: Binary.fromHex(recipientAddress), // EVM address
        value: valueInPlanck, // Amount in native chain units (planck) - already bigint
        gas_limit: {
          // computation cost
          ref_time: BigInt(1e12),
          // storage cost  
          proof_size: BigInt(1e6), 
        },
        storage_deposit_limit: BigInt(1000000000000000), // Storage deposit limit
        data: Binary.fromHex("0x")// Empty data
      })

      console.log('📝 Transaction prepared:', call)

      // Get the signer from the selected account
      console.log('🔍 Checking signer:', {
        hasSelectedAccount: !!selectedAccount,
        hasPolkadotSigner: !!selectedAccount?.polkadotSigner,
        signerType: typeof selectedAccount?.polkadotSigner,
        signerKeys: selectedAccount?.polkadotSigner ? Object.keys(selectedAccount.polkadotSigner) : 'N/A',
        signerPrototype: selectedAccount?.polkadotSigner ? Object.getPrototypeOf(selectedAccount.polkadotSigner) : 'N/A',
        signerConstructor: selectedAccount?.polkadotSigner?.constructor?.name || 'N/A'
      })

      // Deep inspection of signer methods
      if (selectedAccount?.polkadotSigner) {
        const signer = selectedAccount.polkadotSigner as any
        console.log('🔬 Signer method inspection:', {
          hasSignPayload: typeof signer.signPayload === 'function',
          hasSignRaw: typeof signer.signRaw === 'function',
          signerMethods: Object.getOwnPropertyNames(signer),
          prototypeMethos: Object.getOwnPropertyNames(Object.getPrototypeOf(signer) || {})
        })
      }

      if (!selectedAccount.polkadotSigner) {
        console.error('❌ No signer available for selected account:', selectedAccount)
        
        // Try to get a fresh signer as a fallback
        console.log('🔄 Attempting to get fresh signer...')
        try {
          const { web3FromSource } = await import('@polkadot/extension-dapp')
          const injector = await web3FromSource(selectedAccount.walletId || 'polkadot-js')
          const freshSigner = injector.signer
          
          if (freshSigner) {
            console.log('✅ Fresh signer obtained successfully')
            console.log('🔍 Fresh signer inspection:', {
              type: typeof freshSigner,
              constructor: freshSigner.constructor?.name,
              methods: Object.getOwnPropertyNames(freshSigner),
              hasSignPayload: typeof freshSigner.signPayload === 'function'
            })
            selectedAccount.polkadotSigner = freshSigner as any
          } else {
            throw new Error('Fresh signer is also null')
          }
        } catch (signerError) {
          console.error('❌ Failed to get fresh signer:', signerError)
          throw new Error(`No signer available for the selected account (${selectedAccount.address}). Please reconnect your wallet.`)
        }
      }

      console.log('✅ Using signer for account:', selectedAccount.address, 'from wallet:', selectedAccount.walletName)

      // Get the signer with proper compatibility checks
      const signer = await getCompatibleSigner(selectedAccount, chainClient)
      console.log('✅ Using compatible signer:', typeof signer)

      console.log('✍️ Signing transaction...')
      toast.loading('Please sign the transaction in your wallet...', { id: 'bridge-tx' })
      
      // Sign and submit transaction using the compatible signer
      let result
      try {
        console.log('📝 Signing transaction with compatible signer...')
        
        const options = {
          mortality: { mortal: true, period: 64 },
        }
        
        const obsTxEvents = call.signSubmitAndWatch(signer, options)
          .pipe(
            catchError((error) => of({ type: "error" as const, error })),
            shareReplay(1),
          )
        
        result = await new Promise((resolve, reject) => {
          const subscription = obsTxEvents.subscribe((event) => {
            console.log('📡 Transaction event:', event)
            
            if (event.type === 'finalized') {
              subscription.unsubscribe()
              resolve(event)
            } else if (event.type === 'error') {
              subscription.unsubscribe()
              reject(event.error)
            }
          })
        })
        
        console.log('✅ Transaction successful:', result)
      } catch (signError: any) {
        console.error('❌ SignAndSubmit failed:', signError)
        console.error('❌ Error details:', {
          message: signError?.message,
          stack: signError?.stack,
          name: signError?.name,
          cause: signError?.cause,
          signerInfo: {
            type: typeof signer,
            constructor: signer?.constructor?.name,
            hasSignPayload: typeof signer?.signPayload === 'function',
            address: selectedAccount.address,
            walletId: selectedAccount.walletId
          }
        })
        
        // Check if it's a signer compatibility issue
        const isSignerError = signError?.message?.includes('signer') || 
                             signError?.message?.includes('compatible') ||
                             signError?.message?.includes('reconnect') ||
                             signError?.message?.includes('length')
        
        if (isSignerError) {
          toast.error(
            <div className="space-y-2">
              <div className="font-medium">Signer compatibility issue</div>
              <div className="text-sm">Please try reconnecting your wallet or use a different account</div>
              <button 
                onClick={() => window.location.reload()} 
                className="text-sm underline hover:no-underline"
              >
                Reload page to reconnect
              </button>
            </div>, 
            { id: 'bridge-tx', duration: 10000 }
          )
          throw new Error('Signer compatibility issue. Please try reconnecting your wallet or use a different account.')
        } else {
          toast.error(`Transaction failed: ${signError?.message || 'Unknown error'}`, { id: 'bridge-tx' })
          throw signError
        }
      }

      console.log('📤 Transaction completed:', result)

      // Refresh balance after successful transaction
      await fetchAccountBalance()

      console.log('🎉 Bridge transaction completed successfully!')

      toast.success(
        <div className="space-y-1">
          <div className="font-medium">Bridge successful! 🎉</div>
          <div className="text-sm text-muted-foreground">
            {amount} {fromNetwork.symbol} bridged to PolkaVM
          </div>
        </div>,
        { id: 'bridge-tx', duration: 5000 }
      )

      // Clear form
      setAmount("")
      setRecipientAddress("")

    } catch (error) {
      console.error('❌ Bridge transaction failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Bridge transaction failed'
      setBridgeError(errorMessage)

      toast.error(
        <div className="space-y-1">
          <div className="font-medium">Bridge failed ❌</div>
          <div className="text-sm text-muted-foreground">{errorMessage}</div>
        </div>,
        { id: 'bridge-tx', duration: 5000 }
      )
    } finally {
      setIsBridging(false)
    }
  }

  return (
    <div className="min-h-screen network-grid">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-balance">PolkaVM Bridge</h1>
          </div>

          <div className="flex items-center gap-4">
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-3 text-balance">Bridge Your Tokens to PolkaVM Asset Hub</h2>
          <p className="text-muted-foreground text-pretty">
            Convert native tokens to PolkaVM Asset Hub tokens seamlessly
          </p>
        </div>

        {/* Debug Info (Development Only) */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="p-4 mb-6 bg-yellow-50 border-yellow-200">
            <div className="text-sm space-y-2">
              <div className="font-medium text-yellow-800">🔍 Debug Info:</div>
              <div className="text-yellow-700">
                <div>From Network: {fromNetwork.name} ({fromNetwork.id})</div>
                <div>Selected Account: {selectedAccount?.address || 'None'}</div>
                <div>Account Wallet: {selectedAccount?.walletName || 'None'}</div>
                <div>Signer Available: {selectedAccount?.polkadotSigner ? '✅ Yes' : '❌ No'}</div>
                <div>Chain Client: {chainClient ? `✅ ${chainClient.chainName}` : '❌ Not connected'}</div>
                <div>Balance: {accountBalance} {fromNetwork.symbol}</div>
                <div>Is Loading: {isLoadingBalance ? 'Yes' : 'No'}</div>
                <div>Is Bridging: {isBridging ? 'Yes' : 'No'}</div>
                {bridgeError && <div className="text-red-600">Error: {bridgeError}</div>}
              </div>
            </div>
          </Card>
        )}

        {/* Bridge Error Display */}
        {bridgeError && (
          <Card className="p-4 mb-6 bg-red-50 border-red-200">
            <div className="text-sm">
              <div className="font-medium text-red-800 mb-2">❌ Bridge Transaction Failed</div>
              <div className="text-red-700">{bridgeError}</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBridgeError(null)}
                className="mt-2 text-red-600 hover:text-red-800"
              >
                Dismiss
              </Button>
            </div>
          </Card>
        )}

        {/* Bridge Card */}
        <Card className="p-6 token-card-hover glow-effect">
          {/* From Section */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">From</label>
              <Badge variant="outline" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                ~2 min
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 bg-secondary/50 border-border/50">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="flex items-center gap-3 cursor-pointer hover:bg-secondary/70 transition-colors rounded-md p-2 -m-2">
                      <div
                        className={`w-8 h-8 ${fromNetwork.color} rounded-full flex items-center justify-center text-white text-sm font-bold`}
                      >
                        {fromNetwork.symbol[0]}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{fromNetwork.name}</div>
                        <div className="text-xs text-muted-foreground">{fromNetwork.symbol}</div>
                      </div>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-80">
                    <ScrollArea className="h-64">
                      {fromNetworks.map((network) => (
                        <DropdownMenuItem
                          key={network.id}
                          onClick={() => handleFromNetworkSelect(network)}
                          className="flex items-center gap-3 p-3 cursor-pointer"
                        >
                          <div
                            className={`w-8 h-8 ${network.color} rounded-full flex items-center justify-center text-white text-sm font-bold`}
                          >
                            {network.symbol[0]}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{network.name}</div>
                            <div className="text-xs text-muted-foreground">{network.symbol}</div>
                          </div>
                          {network.id === fromNetwork.id && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </ScrollArea>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Card>

              <Card className="p-4 bg-secondary/50 border-border/50">
                <div className="flex items-center gap-3 cursor-pointer">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">
                    {selectedToken.symbol[0]}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{selectedToken.symbol}</div>
                    <div className="text-xs text-muted-foreground">{selectedToken.name}</div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </div>
              </Card>
            </div>

            <div className="relative">
              <Input
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-2xl h-16 bg-secondary/30 border-border/50 pr-20"
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-primary/80"
                onClick={() => setAmount(accountBalance)}
                disabled={isLoadingBalance || accountBalance === "0.0000"}
              >
                MAX
              </Button>
            </div>

            <div className="flex justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
              <span>
                  Balance: {isLoadingBalance ? "Loading..." : `${accountBalance} ${fromNetwork.symbol}`}
              </span>
                {selectedAccount?.address && (
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={fetchAccountBalance}
                      disabled={isLoadingBalance}
                      className="h-6 px-2 text-xs"
                    >
                      🔄
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        console.log('🧪 Manual test - Chain client state:', {
                          chainClient: chainClient,
                          windowClient: (window as any).__PAPI_CLIENT__,
                          windowApi: (window as any).__PAPI_API__,
                          selectedAccount: selectedAccount
                        })
                      }}
                      className="h-6 px-2 text-xs"
                    >
                      🧪
                    </Button>
                  </div>
                )}
              </div>
              <span>{selectedToken.price}</span>
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center mb-6">
            <Button
              variant="outline"
              size="icon"
              onClick={swapNetworks}
              className="rounded-full border-border/50 hover:bg-secondary/50 hover:border-primary/50 bg-transparent"
            >
              <ArrowUpDown className="w-4 h-4" />
            </Button>
          </div>

          {/* To Section */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">To</label>
              <Badge variant="outline" className="text-xs">
                {toNetwork.name}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 bg-secondary/50 border-border/50">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="flex items-center gap-3 cursor-pointer hover:bg-secondary/70 transition-colors rounded-md p-2 -m-2">
                      <div
                        className={`w-8 h-8 ${toNetwork.color} rounded-full flex items-center justify-center text-white text-sm font-bold`}
                      >
                        {toNetwork.symbol[0]}
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
                      {toNetworks.map((network) => (
                        <DropdownMenuItem
                          key={network.id}
                          onClick={() => handleToNetworkSelect(network)}
                          className="flex items-center gap-3 p-3 cursor-pointer"
                        >
                          <div
                            className={`w-8 h-8 ${network.color} rounded-full flex items-center justify-center text-white text-sm font-bold`}
                          >
                            {network.symbol[0]}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{network.name}</div>
                            <div className="text-xs text-muted-foreground">{network.symbol}</div>
                          </div>
                          {network.id === toNetwork.id && (
                            <Check className="w-4 h-4 text-primary" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </ScrollArea>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Card>

              <Card className="p-4 bg-secondary/50 border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">
                    {selectedToken.symbol[0]}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{selectedToken.symbol}</div>
                    <div className="text-xs text-muted-foreground">PolkaVM {selectedToken.name}</div>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-4 bg-secondary/30 border-border/50">
              <div className="text-2xl font-mono text-muted-foreground">{amount || "0.0"}</div>
              <div className="text-sm text-muted-foreground mt-1">
                You will receive ≈ {amount || "0.0"} PolkaVM {selectedToken.symbol}
              </div>
            </Card>
          </div>

          {/* Recipient Address Section */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Recipient Address</label>
              <Badge variant="outline" className="text-xs">
                PolkaVM Address
              </Badge>
            </div>

            <div className="relative">
              <Input
                type="text"
                placeholder="0x742d35Cc6634C0532925a3b8D4C9db96590e4CAb"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className={`pr-12 ${recipientAddress && !isValidEvmAddress(recipientAddress)
                    ? "border-red-500 focus:border-red-500"
                    : recipientAddress && isValidEvmAddress(recipientAddress)
                      ? "border-green-500 focus:border-green-500"
                      : ""
                }`}
              />
              {recipientAddress && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={copyAddress}
                >
                  {addressCopied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              )}
            </div>

            {recipientAddress && !isValidEvmAddress(recipientAddress) && (
              <p className="text-sm text-red-500">Please enter a valid EVM address (0x...)</p>
            )}

            <p className="text-xs text-muted-foreground">
              Enter the PolkaVM address where you want to receive your tokens. Make sure you control this address.
            </p>
          </div>

          {/* Bridge Button */}
          <Button
            className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90 glow-effect"
            disabled={!isConnected || !amount || !recipientAddress || !isValidEvmAddress(recipientAddress) || isBridging}
            onClick={bridgeTokens}
          >
            {isBridging
              ? "🔄 Bridging..."
              : !isConnected
              ? "Connect Wallet to Bridge"
              : !recipientAddress
                ? "Enter Recipient Address"
                : !isValidEvmAddress(recipientAddress)
                  ? "Invalid EVM Address"
                    : !amount
                      ? "Enter Amount"
                      : `Bridge ${amount} ${selectedToken.symbol}`}
          </Button>
        </Card>
      </div>
    </div>
  )
}
