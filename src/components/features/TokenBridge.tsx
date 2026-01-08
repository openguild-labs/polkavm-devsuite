"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowUpDown,
  ChevronDown,
  Zap,
  Clock,
  Copy,
  Check,
  ExternalLink,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WalletConnect } from "./WalletConnect";
import { EvmWalletConnect } from "./EvmWalletConnect";
import {
  FROM_NETWORKS,
  TO_NETWORKS,
  CHAINS,
  POLKAVM_CHAINS,
  type SupportedChain,
  type SupportedPolkaVMChain,
} from "@/constants";
import { usePapiClient } from "@/hooks/usePapiClient";
import { useAccount, useChain, useChains, useDisconnect } from "@luno-kit/react";
import { useChainId, useConfig, useAccount as useEvmAccount, useSwitchChain} from "wagmi";
import { createPublicClient, http, formatEther } from 'viem';
import { useDisconnect as useEvmDisconnect } from 'wagmi';
import { useEffect } from "react";
import { createClient as createSubstrateClient } from "polkadot-api";
import { getWsProvider } from "polkadot-api/ws-provider/web";
import { useEvmCall } from "@/hooks/useEvmCall";
import { convertSS58ToH160 } from "@/lib/utils";
import { EVM_TO_SUBSTRATE, SUBSTRATE_TO_EVM, useEvmChainIcons } from "@/config/chainMapping";
import { TxHashRow } from "./TxHashRow";

export function TokenBridge() {
  
  const {
    balance,
    loadingBalance,
    refreshBalance,
    switchChain,
    isReady,
    mapAccount,
    depositAccount,
    isMappedAccount,
    client,
  } = usePapiClient();
  const { disconnect: disconnectEvm } = useEvmDisconnect();
  const { disconnect: disconnectSubstrate } = useDisconnect();
  
  const { address } = useAccount();
  const { address: evmAddress } = useEvmAccount();
  const { chain } = useChain(); 
  const chains = useChains(); 

  const config = useConfig(); 
  const evmChains = config.chains; 

  const isSubstrateConnected = !!address;
  const isEvmConnected = !!evmAddress;
  const isConnected = isSubstrateConnected || isEvmConnected;
  
  // Chain wagmi 
  const chainId = useChainId();
  const { switchChain: wagmiSwitchChain } = useSwitchChain();
  const isEvm = !!evmAddress;
  // if EVM → chain with id
  const evmChain = isEvm
    ? evmChains.find(c => c.id === chainId) || null
    : null;
  // if Substrate →  chain with luno-kit (chain object)
  const substrateChain = !isEvm ? chain : null;
  const currentChain = isEvm ? evmChain : substrateChain;
  const [fromType, setFromType] = useState<"EVM" | "SUBSTRATE" | null>(null);

  useEffect(() => {
    if (isEvmConnected) setFromType("EVM");
    else if (isSubstrateConnected) setFromType("SUBSTRATE");
    else setFromType(null);
  }, [isEvmConnected, isSubstrateConnected]);
  
  let toChain: any = null;
  // CASE 1: FROM SUBSTRATE → TO EVM
  if (!isEvm && substrateChain) {
    const evmTargetId = SUBSTRATE_TO_EVM[substrateChain.name]; 
    toChain = evmChains.find(c => c.id === evmTargetId) || null;
  }
  // CASE 2: FROM EVM → TO SUBSTRATE
  if (isEvm && evmChain) {
    // Convert chainId number
    const evmId = Number(evmChain.id);
    // chain Substrate with map
    const substrateTargetName = EVM_TO_SUBSTRATE[evmId];
    toChain = chains.find(c => c.name === substrateTargetName) || null;
  }
  if (!isConnected) {
    toChain = null;
  }

  // Click network on dropdown → chain 
  const handleSelect = (network: (typeof evmChains)[number]) => {
    if (isEvm) {
      wagmiSwitchChain({ chainId: network.id });
    }
  };

  
  const getChainIcon = (chain: any, evmIcons: Record<number, string>) => {

    if (chain?.id && evmIcons[chain.id]) {
      return evmIcons[chain.id];
    }

    if (chain?.chainIconUrl) {
      return chain.chainIconUrl;
    }

    return "/icons/default-chain.svg";
  };
  const evmIcons = useEvmChainIcons();
  const [fromNetwork, setFromNetwork] = useState<any>(null);
  const [toNetwork, setToNetwork] = useState<any>(null);

  useEffect(() => {
    if (!isConnected) {
      setFromNetwork(null);
      setToNetwork(null);
      return;
    }

    // set fromNetwork
    setFromNetwork(isEvm ? evmChain : substrateChain);

    // map target chain
    if (isEvm && evmChain) {
      const substrateTargetName = EVM_TO_SUBSTRATE[evmChain.id];
      setToNetwork(chains.find(c => c.name === substrateTargetName) || null);
    } 
    
    if (!isEvm && substrateChain) {
      const targetEvmId = SUBSTRATE_TO_EVM[substrateChain.name];
      setToNetwork(evmChains.find(c => c.id === targetEvmId) || null);
    }
  }, [isConnected, isEvm, evmChain, substrateChain]);


  const [selectedToken, setSelectedToken] = useState({
    symbol: "",
    name: "",
    price: "$",
    chainIconUrl: "",
  });
  const [amount, setAmount] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [addressCopied, setAddressCopied] = useState(false);
  const [isBridging, setIsBridging] = useState(false);
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const [evmBalance, setEvmBalance] = useState<string | null>(null);
  const [isLoadingEvmBalance, setIsLoadingEvmBalance] = useState(false);
  const [substrateBalance, setSubstrateBalance] = useState<string | null>(null);
  const [isLoadingSubstrateBalance, setIsLoadingSubstrateBalance] = useState(false);
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [transactionSteps, setTransactionSteps] = useState({
    mapAccount: {
      status: "pending" as "pending" | "active" | "completed",
      txHash: null as string | null,
    },
    call: {
      status: "pending" as "pending" | "active" | "completed",
      txHash: null as string | null,
    },
  });
  const [mapTxHash, setMapTxHash] = useState<string | null>(null);
  const [bridgeTxHash, setBridgeTxHash] = useState<string | null>(null);
  const [isReversed, setIsReversed] = useState(false);
  const [isPolkaVMToSubstrate, setIsPolkaVMToSubstrate] = useState(false);

  // EVM call hook for PolkaVM to Substrate bridging
  // Only initialize evmCall for PolkaVM to Substrate transfers
  // helper safe checks
  const isEvmChain = (n: any) =>
    Boolean(n && ("chainId" in n || typeof (n as any).chainId === "number"));

  const isSubstrateChain = (n: any) =>
    Boolean(n && ("genesisHash" in n || typeof (n as any).genesisHash === "string"));

  const isFromPolkaVM = isEvmChain(fromNetwork) || isEvm;
  const isToSubstrate = isSubstrateChain(toNetwork) || !isEvm;

  console.log("🔧 EVM Call initialization:");
  console.log("- isFromPolkaVM:", isFromPolkaVM);
  console.log("- isToSubstrate:", isToSubstrate);
  console.log("- recipientAddress:", recipientAddress);
  console.log("- amount:", amount);

  const evmCall = useEvmCall({
    to: (isFromPolkaVM && isToSubstrate && recipientAddress)
      ? convertSS58ToH160(recipientAddress) as `0x${string}`
      : "0x0000000000000000000000000000000000000000" as `0x${string}`,
    value: amount || "0"
  });

  console.log("📊 EVM Call state:", {
    to: evmCall.to,
    value: evmCall.value,
    txHash: evmCall.txHash,
    isSending: evmCall.isSending,
    isConfirming: evmCall.isConfirming,
    isSuccess: evmCall.isSuccess,
    error: evmCall.error
  });

  const getTokenName = (network: any) => {
    if (network.displayName) {
      const baseName = network.displayName.replace(/PolkaVM\s+/i, '').replace(/\s+Asset Hub/i, '');
      return `PolkaVM ${baseName} Token`;
    } else {
      return `${network.name} Token`;
    }
  };

  const swapNetworks = () => {
    if (!fromNetwork || !toNetwork) return;

    const isFromPolkaVM = isEvmChain(fromNetwork) || isEvm;
    const isToSubstrate = isSubstrateChain(toNetwork) || !isEvm;

    if (isFromPolkaVM && isToSubstrate) {
      disconnectEvm();
    } else if (!isFromPolkaVM && !isToSubstrate) {
      disconnectSubstrate();
    }

    setIsReversed(!isReversed);
    const tempFrom = fromNetwork;
    setFromNetwork(toNetwork);
    setToNetwork(tempFrom);

    setSelectedToken({
      symbol: toNetwork.symbol,
      name: getTokenName(toNetwork),
      price: "$",
      chainIconUrl: toNetwork.chainIconUrl,
    });

    if (address) {
      switchChain(); 
    }
  };


  const handleFromNetworkSelect = (network: any) => {
    setFromNetwork(network);
    const correspondingToNetworkIdMap: Record<string, string> = {
      paseoPassetHub: "passet",
      westendAssetHub: "wah",
      kusamaAssetHub: "kah",
      passet: "paseoPassetHub",
      wah: "westendAssetHub",
      kah: "kusamaAssetHub",
    };

    const correspondingToNetworkId = correspondingToNetworkIdMap[network.id];
    let correspondingToNetwork: any = null;
    if (correspondingToNetworkId) {
      correspondingToNetwork =
        CHAINS[correspondingToNetworkId as keyof typeof CHAINS] ||
        POLKAVM_CHAINS[correspondingToNetworkId as keyof typeof POLKAVM_CHAINS];
    }

    if (correspondingToNetwork) {
      setToNetwork(correspondingToNetwork);
    }
    setSelectedToken({
      symbol: network.symbol,
      name: getTokenName(network),
      price: "$",
      chainIconUrl:
        (CHAINS[network.id as keyof typeof CHAINS]?.nativeCurrency.tokenUrl as string) ||
        network.chainIconUrl,
    });
    if (address) {
      switchChain();
    }
  };

  const handleToNetworkSelect = (network: any) => {
    setToNetwork(network);

    const correspondingFromNetwork = [...FROM_NETWORKS, ...TO_NETWORKS].find((otherNetwork) => {
      if (network.id === "paseoPassetHub") return otherNetwork.id === "passet";
      if (network.id === "westendAssetHub") return otherNetwork.id === "wah";
      if (network.id === "kusamaAssetHub") return otherNetwork.id === "kah";
      if (network.id === "passet") return otherNetwork.id === "paseoPassetHub";
      if (network.id === "wah") return otherNetwork.id === "westendAssetHub";
      if (network.id === "kah") return otherNetwork.id === "kusamaAssetHub";
      return false;
    });

    if (correspondingFromNetwork) {
      setFromNetwork(correspondingFromNetwork);
      setSelectedToken({
        symbol: correspondingFromNetwork.symbol,
        name: getTokenName(correspondingFromNetwork),
        price: "$",
        chainIconUrl:
          CHAINS[correspondingFromNetwork.id as keyof typeof CHAINS]
            ?.nativeCurrency.tokenUrl || correspondingFromNetwork.chainIconUrl,
      });
    }
  };

  const copyAddress = async () => {
    if (recipientAddress) {
      await navigator.clipboard.writeText(recipientAddress);
      setAddressCopied(true);
      setTimeout(() => setAddressCopied(false), 2000);
    }
  };

  const isValidEvmAddress = (address: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const isValidSubstrateAddress = (address: string) => {
    return /^[1-9A-HJ-NP-Za-km-z]{47,48}$/.test(address);
  };

  const getAddressValidation = () => {
    if (!fromType) return () => true;

    return fromType === "EVM"
      ? isValidSubstrateAddress
      : isValidEvmAddress;
  };

  const getAddressPlaceholder = () => {
    if (!isConnected) return "Connect your wallet first…";

    return fromType === "EVM"
      ? "Your Substrate address here"
      : "Your EVM address here";
  };

  const getAddressLabel = () => {
    if (!isConnected) return "Address";

    return fromType === "EVM"
      ? "Substrate Address"
      : "PolkaVM Address";
  };

  const fetchEvmBalance = async (address: string, toNetworkId: string) => {
    if (!isValidEvmAddress(address)) return;

    setIsLoadingEvmBalance(true);
    try {
      const polkavmChain =
        POLKAVM_CHAINS[toNetworkId as keyof typeof POLKAVM_CHAINS];
      if (!polkavmChain) return;

      const client = createPublicClient({
        transport: http(polkavmChain.rpcUrl),
      });
      const balance = await client.getBalance({ address: address as `0x${string}` });
      const formattedBalance = formatEther(balance);

      setEvmBalance(formattedBalance);
    } catch (error) {
      console.error("Failed to fetch EVM balance:", error);
      setEvmBalance(null);
    } finally {
      setIsLoadingEvmBalance(false);
    }
  };

  const fetchSubstrateBalance = async (address: string, toNetworkId: string) => {
    if (!isValidSubstrateAddress(address)) return;

    setIsLoadingSubstrateBalance(true);
    try {
      // Find the corresponding chain for the TO network
      const chain = Object.values(CHAINS).find(chain => chain.id === toNetworkId);
      if (!chain) return;

      console.log("Initializing client for chain:", chain.name);

      const substrateClient = createSubstrateClient(
        getWsProvider(chain.rpcUrls.webSocket[0], (_status) => {
          switch (_status.type) {
            case 0:
              console.info('⚫️ Connecting to ==> ', chain.name);
              break;
          }
        })
      );
      // Fetch balance using the current client and chain
      const accountInfo = await (substrateClient as any).getTypedApi(chain.descriptors).query.System.Account.getValue(address);

      const decimals = chain.nativeCurrency.decimals;
      const total = BigInt(accountInfo.data.free) - BigInt(accountInfo.data.frozen || 0);
      const formattedTotal = (Number(total) / 10 ** decimals).toFixed(4);

      setSubstrateBalance(formattedTotal);
    } catch (error) {
      console.error("Failed to fetch Substrate balance:", error);
      setSubstrateBalance(null);
    } finally {
      setIsLoadingSubstrateBalance(false);
    }
  };

  
  useEffect(() => {
    const validateAddress = getAddressValidation();
    if (!recipientAddress || !validateAddress(recipientAddress) || !toChain) {
      setEvmBalance(null);
      setSubstrateBalance(null);
      return;
    }
    // CASE 1 — FROM EVM → TO SUBSTRATE
    if (fromType === "EVM") {
      console.log("Fetching Substrate balance for:", recipientAddress);
      fetchSubstrateBalance(recipientAddress, toChain.genesisHash);
      setEvmBalance(null);
      return;
    }
    // CASE 2 — FROM SUBSTRATE → TO EVM
    if (fromType === "SUBSTRATE") {
      console.log("Fetching EVM balance for:", recipientAddress);
      fetchEvmBalance(recipientAddress, toChain.id);
      setSubstrateBalance(null);
      return;
    }
  }, [recipientAddress, toChain, fromType]);


  const bridgeTokens = async () => {
    const validateAddress = getAddressValidation();

    // Debug input
    console.log("Validate:", validateAddress(recipientAddress));
    console.log("Recipient:", recipientAddress);
    console.log("Amount:", amount);
    console.log("Substrate Address:", address);

    // Direction Detection
    const isFromPolkaVM = isEvm === true;     
    const isFromSubstrate = isEvm === false;  

    const isToSubstrate = isEvm === true;     
    const isToPolkaVM = isEvm === false;      

    console.log("Direction:", {
      isFromPolkaVM,
      isToSubstrate,
      isFromSubstrate,
      isToPolkaVM,
    });

    // Wallet Requirement Check
    if (isFromPolkaVM && !evmAddress) {
      setBridgeError("Please connect your EVM wallet");
      return;
    }

    if (isFromSubstrate && !address) {
      setBridgeError("Please connect your Substrate wallet");
      return;
    }

    // Input validation
    if (!recipientAddress || !amount || !validateAddress(recipientAddress)) {
      setBridgeError("Please fill in all required fields with valid values");
      return;
    }

    // Initialize UI
    setIsBridging(true);
    setBridgeError(null);
    setShowTransactionDialog(true);
    setMapTxHash(null);
    setBridgeTxHash(null);

    try {
      // CASE 1: PolkaVM (EVM) → Substrate
      if (isFromPolkaVM && isToSubstrate) {
        console.log("PolkaVM → Substrate detected");

        setTransactionSteps({
          mapAccount: { status: "completed", txHash: null },
          call: { status: "active", txHash: null },
        });

        console.log("Executing EVM call...");
        const txHash = await evmCall.execute();
        setBridgeTxHash(txHash);

        console.log("Waiting for receipt...");
        const receipt = await evmCall.waitForReceipt();

        // Update UI
        setTransactionSteps(prev => ({
          ...prev,
          call: { status: "completed", txHash },
        }));

        console.log("Receipt:", receipt);
      }

      // CASE 2: Substrate → PolkaVM (EVM)
      if (isFromSubstrate && isToPolkaVM) {
        console.log("Substrate → PolkaVM detected");

        const alreadyMapped = await isMappedAccount();

        // Already mapped → skip mapping
        if (alreadyMapped) {
          setTransactionSteps({
            mapAccount: { status: "completed", txHash: null },
            call: { status: "active", txHash: null },
          });

          const deposit = await depositAccount(recipientAddress, amount);

          setTransactionSteps(prev => ({
            ...prev,
            call: { status: "completed", txHash: deposit.transactionHash },
          }));
          setBridgeTxHash(deposit.transactionHash);
        }

        // Need to map first
        else {
          setTransactionSteps({
            mapAccount: { status: "active", txHash: null },
            call: { status: "pending", txHash: null },
          });

          // Map step
          const mapRes = await mapAccount();

          setTransactionSteps(prev => ({
            ...prev,
            mapAccount: { status: "completed", txHash: mapRes.transactionHash },
          }));
          setMapTxHash(mapRes.transactionHash);

          // Deposit step
          setTransactionSteps(prev => ({
            ...prev,
            call: { status: "active", txHash: null },
          }));

          const deposit = await depositAccount(recipientAddress, amount);

          setTransactionSteps(prev => ({
            ...prev,
            call: { status: "completed", txHash: deposit.transactionHash },
          }));
          setBridgeTxHash(deposit.transactionHash);
        }
      }

      console.log("Bridge Completed!");

      // Reset UI
      setTimeout(() => {
        setShowTransactionDialog(false);
        setIsBridging(false);
        refreshBalance();
        setAmount("");
      }, 8000);

    } catch (error: any) {
      console.error("Bridge failed:", error);
      setBridgeError(error?.message || "Transaction failed");
      setIsBridging(false);
    }
  };


  return (
    <div className="min-h-screen network-grid">
      {/* Main Content */}
      <div className="mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-3 text-balance">
            Bridge Your Tokens to PolkaVM Asset Hub
          </h2>
          <p className="text-muted-foreground text-pretty">
            Convert native tokens to PolkaVM Asset Hub tokens seamlessly
          </p>
        </div>

        {/* Bridge Error Display */}
        {bridgeError && (
          <Card className="p-4 mb-6 bg-red-50 border-red-200">
            <div className="text-sm">
              <div className="font-medium text-red-800 mb-2">
                ❌ Bridge Transaction Failed
              </div>
              <div className="text-red-700">{bridgeError}</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBridgeError(null)}
                className="mt-2 text-red-600 hover:text-red-800">
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
                ~6s
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">              
              {address && (
                <>
                  {/* SUBSTRATE CHAIN DROPDOWN CARD */}
                  <Card className="p-4 bg-secondary/50 border-border/50">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <div className="flex items-center gap-3 cursor-pointer hover:bg-secondary/70 transition-colors rounded-md p-2 -m-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                            <img
                              src={chain?.chainIconUrl}
                              alt={chain?.name}
                              className="w-8 h-8 object-contain"
                              onError={(e) => (e.currentTarget.style.display = "none")}
                            />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{chain?.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {chain?.nativeCurrency.symbol}
                            </div>
                          </div>
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent className="w-80">
                        <ScrollArea className="h-64">
                          {chains.map((network) => (
                            <DropdownMenuItem
                              key={network.genesisHash}
                              onClick={() => handleFromNetworkSelect(network)}
                              className="flex items-center gap-3 p-3 cursor-pointer"
                            >
                              <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                                <img
                                  src={network.chainIconUrl}
                                  alt={network.name}
                                  className="w-8 h-8 object-contain"
                                  onError={(e) => (e.currentTarget.style.display = "none")}
                                />
                              </div>

                              <div className="flex-1">
                                <div className="font-medium">{network.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {network.nativeCurrency.symbol}
                                </div>
                              </div>

                              {network.genesisHash === chain?.genesisHash && (
                                <Check className="w-4 h-4 text-primary" />
                              )}
                            </DropdownMenuItem>
                          ))}
                        </ScrollArea>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Card>
                  {/* SUBSTRATE SMALL CARD */}
                  <Card className="p-4 bg-secondary/50 border-border/50">
                    <div className="flex items-center gap-3 cursor-pointer">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                        <img
                          src={chain?.chainIconUrl}
                          alt={chain?.name}
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            target.style.display = "none";
                            const nextElement = target.nextElementSibling as HTMLElement;
                            if (nextElement) nextElement.style.display = "flex";
                          }}
                        />
                      </div>

                      <div className="flex-1">
                        <div className="font-medium">{chain?.nativeCurrency.symbol}</div>
                        <div className="text-xs text-muted-foreground">
                          {chain?.nativeCurrency.name}
                        </div>
                      </div>
                    </div>
                  </Card>                
                </>
              )}

              {evmAddress && (
                <>
                  {/* EVM CHAIN DROPDOWN CARD */}
                  <Card className="p-4 bg-secondary/50 border-border/50">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <div className="flex items-center gap-3 cursor-pointer hover:bg-secondary/70 transition-colors rounded-md p-2 -m-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">   
                            <img
                              src={getChainIcon(currentChain, evmIcons)}
                              className="w-8 h-8 object-contain"
                              alt={currentChain?.name}
                            />      
                          </div>

                          <div className="flex-1">
                            <div className="font-medium">{currentChain?.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {currentChain?.nativeCurrency?.symbol}
                            </div>
                          </div>

                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent className="w-80">
                        <ScrollArea className="h-64">
                          {evmChains.map((network) => (
                            <DropdownMenuItem
                              key={network.id}
                              onClick={() => handleSelect(network)}
                              className="flex items-center gap-3 p-3 cursor-pointer"
                            >
                              <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                                <img
                                  src={getChainIcon(network, evmIcons)}
                                  className="w-8 h-8 object-contain"
                                  alt={network.name}
                                />
                              </div>

                              <div className="flex-1">
                                <div className="font-medium">{network.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {network.nativeCurrency?.symbol}
                                </div>
                              </div>

                              {isEvm && currentChain && (currentChain as any).id === (network as any).id && (
                                <Check className="w-4 h-4 text-primary" />
                              )}
                            </DropdownMenuItem>
                          ))}
                        </ScrollArea>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Card>
                  {/* EVM SMALL CARD */}
                  <Card className="p-4 bg-secondary/50 border-border/50">
                    <div className="flex items-center gap-3 cursor-pointer">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                          <img
                            src={getChainIcon(currentChain, evmIcons)}
                            className="w-8 h-8 object-contain"
                            alt={currentChain?.name}
                          />
                      </div>

                      <div className="flex-1">
                        <div className="font-medium">{currentChain?.nativeCurrency?.symbol}</div>
                        <div className="text-xs text-muted-foreground">
                          {currentChain?.nativeCurrency?.name}
                        </div>
                      </div>
                    </div>
                  </Card>                
                </>
              )}              
            </div>

            <div className="relative">
              <Input
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={(e) => {
                  const value = e.target.value;
                  if (
                    value === "" ||
                    (parseFloat(value) >= 0 && !isNaN(parseFloat(value)))
                  ) {
                    setAmount(value);
                  }
                }}
                min="0"
                step="0.0001"
                className="text-2xl h-16 bg-secondary/30 border-border/50 pr-20"
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-primary/80"
                onClick={() => setAmount(balance.formattedTotal)}
                disabled={
                  loadingBalance ||
                  !address ||
                  balance.formattedTotal === "0.0000"
                }>
                MAX
              </Button>
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center mb-6">
            <Button
              variant="outline"
              size="icon"
              onClick={swapNetworks}
              className="rounded-full border-border/50 hover:bg-secondary/50 hover:border-primary/50 bg-transparent">
              <ArrowUpDown className="w-4 h-4" />
            </Button>
          </div>

          {/* To Section */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">To</label>
              <Badge variant="outline" className="text-xs">
                {toChain ? toChain.name : "—"}
              </Badge>
            </div>

            {/* ====================  TO SECTION  ===================== */}
            <div className="grid grid-cols-2 gap-4">
              {isSubstrateConnected && fromType === "SUBSTRATE" && (
                <>
                  {/* EVM CHAIN DROPDOWN CARD */}
                  <Card className="p-4 bg-secondary/50 border-border/50">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <div className="flex items-center gap-3 cursor-pointer hover:bg-secondary/70 transition-colors rounded-md p-2 -m-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                            <img
                              src={getChainIcon(currentChain, evmIcons)}
                              className="w-8 h-8 object-contain"
                              alt={currentChain?.name}
                            />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{toChain?.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {toChain?.nativeCurrency?.symbol}
                            </div>
                          </div>

                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent className="w-80">
                        <ScrollArea className="h-64">
                          {evmChains.map((network) => (
                            <DropdownMenuItem
                              key={network.id}
                              onClick={() => handleSelect(network)}
                              className="flex items-center gap-3 p-3 cursor-pointer"
                            >
                              <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                                <img
                                  src={getChainIcon(network, evmIcons)}
                                  className="w-8 h-8 object-contain"
                                  alt={network.name}
                                />
                              </div>

                              <div className="flex-1">
                                <div className="font-medium">{network.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {network.nativeCurrency?.symbol}
                                </div>
                              </div>

                              {isEvm && currentChain && (currentChain as any).id === (network as any).id && (
                                <Check className="w-4 h-4 text-primary" />
                              )}
                            </DropdownMenuItem>
                          ))}
                        </ScrollArea>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Card>

                  {/* SMALL CARD */}
                  <Card className="p-4 bg-secondary/50 border-border/50">
                    <div className="flex items-center gap-3 cursor-pointer">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                        <img
                          src={getChainIcon(currentChain, evmIcons)}
                          className="w-8 h-8 object-contain"
                          alt={currentChain?.name}
                        />
                      </div>

                      <div className="flex-1">
                        <div className="font-medium">{toChain?.nativeCurrency?.symbol}</div>
                        <div className="text-xs text-muted-foreground">
                          {toChain?.nativeCurrency?.name}
                        </div>
                      </div>
                    </div>
                  </Card>
                </>
              )}

             {isEvmConnected && fromType === "EVM" &&( 
                <>
                  {/* SUBSTRATE CHAIN DROPDOWN CARD */}
                  <Card className="p-4 bg-secondary/50 border-border/50">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <div className="flex items-center gap-3 cursor-pointer hover:bg-secondary/70 transition-colors rounded-md p-2 -m-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                            <img
                              src={toChain?.chainIconUrl}
                              alt={toChain?.name}
                              className="w-8 h-8 object-contain"
                            />
                          </div>

                          <div className="flex-1">
                            <div className="font-medium">{toChain?.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {toChain?.nativeCurrency.symbol}
                            </div>
                          </div>

                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent className="w-80">
                        <ScrollArea className="h-64">
                          {chains.map((network) => (
                            <DropdownMenuItem
                              key={network.genesisHash}
                              onClick={() => handleFromNetworkSelect(network)}
                              className="flex items-center gap-3 p-3 cursor-pointer"
                            >
                              <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                                <img src={network.chainIconUrl} className="w-8 h-8" />
                              </div>

                              <div className="flex-1">
                                <div className="font-medium">{network.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {network.nativeCurrency.symbol}
                                </div>
                              </div>

                              {toChain?.genesisHash === network.genesisHash && (
                                <Check className="w-4 h-4 text-primary" />
                              )}
                            </DropdownMenuItem>
                          ))}
                        </ScrollArea>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Card>

                  {/* SMALL CARD */}
                  <Card className="p-4 bg-secondary/50 border-border/50">
                    <div className="flex items-center gap-3 cursor-pointer">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden">
                        <img src={toChain?.chainIconUrl} className="w-8 h-8" />
                      </div>

                      <div className="flex-1">
                        <div className="font-medium">{toChain?.nativeCurrency.symbol}</div>
                        <div className="text-xs text-muted-foreground">
                          {toChain?.nativeCurrency.name}
                        </div>
                      </div>
                    </div>
                  </Card>
                </>
              )}

            </div>

            <Card className="p-4 bg-secondary/30 border-border/50">
              <div className="text-2xl font-mono text-muted-foreground">
                {amount || "0.0"}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {isToSubstrate ? (
                  <>You will receive ≈ {amount || "0.0"} PolkaVM {selectedToken.symbol}</>
                ) : (
                  <>You will receive ≈ {amount || "0.0"} {selectedToken.symbol}</>
                )}
              </div>
            </Card>
          </div>

          {/* Recipient Address Section */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Recipient Address</label>
              <Badge variant="outline" className="text-xs">
                {getAddressLabel()}
              </Badge>
            </div>

            <div className="relative">
              <Input
                type="text"
                placeholder={getAddressPlaceholder()}
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className={`pr-12 ${recipientAddress && !getAddressValidation()(recipientAddress)
                  ? "border-red-500 focus:border-red-500"
                  : recipientAddress && getAddressValidation()(recipientAddress)
                    ? "border-green-500 focus:border-green-500"
                    : ""
                  }`}
              />
              {recipientAddress && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={copyAddress}>
                  {addressCopied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted-foreground" />
                  )}
                </Button>
              )}
            </div>

            {recipientAddress && !getAddressValidation()(recipientAddress) && (
              <p className="text-sm text-red-500">
                Please enter a valid {getAddressLabel().toLowerCase()}
              </p>
            )}

            {/* Balance Display */}
            {recipientAddress &&
              getAddressValidation()(recipientAddress) &&
              toNetwork && (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <span>Balance on {toNetwork.name}:</span>

                  {isEvmChain(toNetwork) ? (
                    // TO network is PolkaVM/EVM → show EVM balance
                    isLoadingEvmBalance ? (
                      <span>Loading...</span>
                    ) : evmBalance !== null ? (
                      <span className="font-medium text-primary">
                        {parseFloat(evmBalance).toFixed(4)} {toNetwork.symbol}
                      </span>
                    ) : (
                      <span>0.0000 {toNetwork.symbol}</span>
                    )
                  ) : (
                    // TO network is Substrate → show Substrate balance
                    isLoadingSubstrateBalance ? (
                      <span>Loading...</span>
                    ) : substrateBalance !== null ? (
                      <span className="font-medium text-primary">
                        {substrateBalance} {toNetwork.symbol}
                      </span>
                    ) : (
                      <span>0.0000 {toNetwork.symbol}</span>
                    )
                  )}
                </div>
              )}



            <p className="text-xs text-muted-foreground">
              Enter the PolkaVM address where you want to receive your tokens.
              Make sure you control this address.
            </p>
          </div>

          {/* Bridge Button */}
          <Button
            className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90 glow-effect"
            disabled={
              !amount ||
              !recipientAddress ||
              !getAddressValidation()(recipientAddress) ||
              isBridging
            }
            onClick={bridgeTokens}>
            {isBridging
              ? "🔄 Bridging..."
              : !recipientAddress
                ? "Enter Recipient Address"
                : !getAddressValidation()(recipientAddress)
                  ? `Invalid ${getAddressLabel()}`
                  : !amount
                    ? "Enter Amount"
                    : `Bridge ${amount} ${selectedToken.symbol}`}
          </Button>
        </Card>
      </div>

      {/* Transaction Progress Dialog */}
      <Dialog
        open={showTransactionDialog}
        onOpenChange={(open) => {
          if (!open) {
            setIsBridging(false);
          }
          setShowTransactionDialog(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-blue-600">
              Transaction Progress
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Bridging tokens to {toNetwork?.name || "target chain"}...
            </p>
          </DialogHeader>

          <div className="space-y-4">
            {/* Current Transaction Hash */}
            <div className="space-y-3">
              {mapTxHash && (
                <TxHashRow label="Map Account TX" txHash={mapTxHash} />
              )}

              {bridgeTxHash && (
                <TxHashRow
                  label="Bridge Transaction TX"
                  txHash={bridgeTxHash}
                />
              )}
            </div>

            {/* Transaction Steps */}
            <div className="space-y-3">
              {/* Map Account Step - Only show for Substrate to PolkaVM */}
              {!isPolkaVMToSubstrate && (
                <div className="flex items-center gap-3">
                  {transactionSteps.mapAccount.status === "completed" ? (
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  ) : transactionSteps.mapAccount.status === "active" ? (
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                      <Loader2 className="h-4 w-4 text-white animate-spin" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                  )}
                  <span
                    className={`text-sm ${transactionSteps.mapAccount.status === "active"
                      ? "text-blue-600 font-medium"
                      : transactionSteps.mapAccount.status === "completed"
                        ? "text-green-600"
                        : "text-gray-500"
                      }`}>
                    Map Account
                  </span>
                </div>
              )}

              {/* Call Step */}
              <div className="flex items-center gap-3">
                {transactionSteps.call.status === "completed" ? (
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                ) : transactionSteps.call.status === "active" ? (
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                )}
                <span
                  className={`text-sm ${transactionSteps.call.status === "active"
                    ? "text-blue-600 font-medium"
                    : transactionSteps.call.status === "completed"
                      ? "text-green-600"
                      : "text-gray-500"
                    }`}>
                  Bridge Call
                </span>
              </div>
            </div>

            {/* Status Message */}
            {!isPolkaVMToSubstrate && transactionSteps.mapAccount.status === "active" && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />
                <span className="text-sm text-yellow-800">
                  Mapping account...
                </span>
              </div>
            )}
            {transactionSteps.call.status === "active" && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />
                <span className="text-sm text-yellow-800">
                  {isPolkaVMToSubstrate ? "Executing bridge call..." : "Waiting for confirmation..."}
                </span>
              </div>
            )}

            {/* Processing Button */}
            <Button
              className="w-full bg-pink-500 hover:bg-pink-600 text-white"
              disabled>
              Processing...
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
