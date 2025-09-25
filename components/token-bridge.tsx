"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown, Wallet, ChevronDown, Zap, Clock, Copy, Check } from "lucide-react"
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
import { chainClient$ } from "@/lib/chain"
import { useStateObservable } from "@react-rxjs/core"

// Color mapping for network icons
const networkColors: Record<string, string> = {
  polkadot: "bg-pink-500",
  kusama: "bg-green-500", 
  westend: "bg-blue-500",
  paseo: "bg-purple-500",
  paseoah: "bg-orange-500",
  paseoAssetHub: "bg-red-500"
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

const tokens = [
  { symbol: "PAS", name: "Paseo Token", price: "$" },
]

export function TokenBridge() {
  const { isConnected, selectedAccount, disconnect } = useWallet()
  const chainClient = useStateObservable(chainClient$)
  const [fromNetwork, setFromNetwork] = useState(fromNetworks[0]) // First supported chain
  const [toNetwork, setToNetwork] = useState(toNetworks[0]) // First supported PolkaVM chain
  const [selectedToken, setSelectedToken] = useState(tokens[0])
  const [amount, setAmount] = useState("")
  const [recipientAddress, setRecipientAddress] = useState("")
  const [addressCopied, setAddressCopied] = useState(false)
  const [accountBalance, setAccountBalance] = useState<string>("0.0000")
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)

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

    if (!selectedAccount?.address) {
      console.log('❌ No selected account address')
      setAccountBalance("0.0000")
      return
    }

    if (!chainClient?.typedApi) {
      console.log('❌ No chain client or typed API available')
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

      const account = await chainClient.typedApi.query.System.Account.getValue(selectedAccount.address)
      console.log('📊 Raw account data:', account)
      
      const balance = account.data.free
      console.log('💰 Raw balance (planck):', balance.toString())
      
      const decimals = fromNetwork.id === 'paseoah' ? 10 : 10
      const formattedBalance = formatBalance(balance, decimals)
      
      setAccountBalance(formattedBalance)
      console.log(`✅ Balance for ${selectedAccount.address}: ${formattedBalance} ${selectedToken.symbol}`)
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

  // Fetch balance when account or chain changes
  useEffect(() => {
    console.log('🔄 useEffect triggered for balance fetch:', {
      selectedAccountAddress: selectedAccount?.address,
      hasChainClient: !!chainClient,
      hasTypedApi: !!chainClient?.typedApi,
      fromNetworkId: fromNetwork.id
    })
    fetchAccountBalance()
  }, [selectedAccount?.address, chainClient?.typedApi, fromNetwork.id])

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
                <div className="flex items-center gap-3 cursor-pointer">
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
                  Balance: {isLoadingBalance ? "Loading..." : `${accountBalance} ${selectedToken.symbol}`}
                </span>
                {selectedAccount?.address && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={fetchAccountBalance}
                    disabled={isLoadingBalance}
                    className="h-6 px-2 text-xs"
                  >
                    🔄
                  </Button>
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
                <div className="flex items-center gap-3 cursor-pointer">
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
                className={`pr-12 ${
                  recipientAddress && !isValidEvmAddress(recipientAddress)
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
            disabled={!isConnected || !amount || !recipientAddress || !isValidEvmAddress(recipientAddress)}
          >
            {!isConnected
              ? "Connect Wallet to Bridge"
              : !recipientAddress
                ? "Enter Recipient Address"
                : !isValidEvmAddress(recipientAddress)
                  ? "Invalid EVM Address"
                  : "Bridge Tokens"}
          </Button>
        </Card>
      </div>
    </div>
  )
}
