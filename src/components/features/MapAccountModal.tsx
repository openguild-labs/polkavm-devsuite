"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { ChevronDown, ChevronUp, Loader2, X } from "lucide-react";
import { useState, useEffect } from "react";
import {CHAINS, GENESIS_HASH_TO_CHAIN_KEY} from "@/constants";

import {
  useChain,
  useChains,
  usePapiSigner,
  useAccount as usePolkadotAccount,
} from "@luno-kit/react";

import { usePapiClient } from "@/hooks/usePapiClient";
import { useReviveAccount } from "@/hooks/useReviveAccount";
import { PolkadotSigner } from "polkadot-api";
import { displayToast } from "../ui/toast-manager";

interface MapAccountModalProps {
  onClose: () => void;
}

interface NetworkOption {
  id: string;
  name: string;
  symbol: string;
  icon?: string;
  raw: any;
  descriptors?: any;
}

function shortenAddress(address: string, start = 3, end = 3) {
  if (!address) return "";
  if (address.length <= start + end + 3) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

export default function MapAccountModal({ onClose }: MapAccountModalProps) {
  const { account: polkadotAccount } = usePolkadotAccount();
  const { chain: currentChain } = useChain();
  const chains = useChains();

  const AVAILABLE_NETWORKS = chains.map((c) => ({
    id: c.genesisHash,
    name: c.name,
    symbol: c.nativeCurrency?.symbol || "",
    icon: c.chainIconUrl,
    raw: c,
    descriptors: CHAINS[GENESIS_HASH_TO_CHAIN_KEY[c.genesisHash]]?.descriptors,
  }));


  const { client } = usePapiClient();
  const { data: papiSigner } = usePapiSigner();
  const { account } = usePolkadotAccount();
  const address = account?.address;
  

  useEffect(() => {
  if (!currentChain) return;

  setSelectedNetwork((prev) => {
    if (prev?.id === currentChain.genesisHash) {
      return prev;
    }

    return (
      AVAILABLE_NETWORKS.find(
        (net) => net.id === currentChain.genesisHash
      ) ?? null
    );
  });
}, [currentChain?.genesisHash]);


  if (!polkadotAccount) return null;

  
  const initialMapped = client?.isMappedAccount?.(address) ?? false;
  const currentChainDescriptors = CHAINS[GENESIS_HASH_TO_CHAIN_KEY[currentChain?.genesisHash as string]]?.descriptors;
  const {
    isMapped,
    loading,
    map,
    unmap,
    hasRevive,
    refresh,
  } = useReviveAccount({
    client,
    chain: currentChain,
    signer: papiSigner as PolkadotSigner,
    address,
    descriptors: currentChainDescriptors,
    initialMapped,
  });

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkOption | null>(null);
  
  const isWrongNetwork =
    !!selectedNetwork &&
    !!currentChain &&
    selectedNetwork.id !== currentChain.genesisHash;


  const handleMapUnmap = async () => {
    if (!selectedNetwork) {
      displayToast("error", "Please select a network first")
      return;
    }

    if (isWrongNetwork) {
      displayToast(
        "error",
        `Wrong network. Please switch to ${selectedNetwork.name}`
      )
      return
    }

    if (!hasRevive) {
      displayToast(
        "error",
        "This chain does not support account mapping"
      )
      return
    }

    try {
      if (isMapped) {
        const result = await unmap();
        if (result.status === "success") {
          displayToast("success", "Account unmapped successfully")
          await refresh();
          onClose()
        } else {
          displayToast("error", result.errorMessage || "Unmap failed")
        }
      } else {
        displayToast("loading", "Mapping account...")
        const result = await map();
        if (result.status === "success") {
          displayToast("success", "Account mapped successfully")
          await refresh();
          onClose()
        } else {
          displayToast("error", result.errorMessage || "Map failed")
        }
      }
      await refresh();
    } catch (err) {
      console.error("Map / Unmap failed:", err);
      displayToast("error", "Transaction failed. Please try again.")
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[1000000] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={() => {
            if (!loading) onClose();
          }}
        />

        {/* Modal */}
        <motion.div
          className="relative bg-[#0F1115] rounded-2xl w-[400px] p-6 z-10 shadow-lg flex flex-col gap-6"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Map Account</h2>
            <button
              onClick={() => {
                if (!loading) onClose();
              }}
              disabled={loading}
              className={`text-gray-400 hover:text-white text-xl ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <X />
            </button>
          </div>

          {/* Account Info */}
          <div
            className="flex items-center justify-between p-3 rounded-xl border border-white/10 cursor-pointer hover:bg-white/5"
            onClick={() => {
              if (!loading) {
                setIsDropdownOpen((prev) => !prev)
              }
            }}
          >
            <div className="flex items-center gap-4">
              <Image
                src={
                  selectedNetwork?.icon ||
                  currentChain?.chainIconUrl ||
                  "/wallets/polkadot.svg"
                }
                alt={selectedNetwork?.name || currentChain?.name || "Chain"}
                width={36}
                height={36}
                className="rounded-full"
              />
              <div className="flex flex-col">
                <span className="text-white font-medium">
                  {shortenAddress(polkadotAccount.address)}
                </span>
                <span className="text-gray-400 text-sm">
                  {selectedNetwork?.name || "Select Network"}
                </span>
              </div>
            </div>
            {isDropdownOpen ? (
              <ChevronUp className="text-white" />
            ) : (
              <ChevronDown className="text-white" />
            )}
          </div>

          {/* Dropdown */}
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                className="bg-[#1A1D23] border border-white/10 rounded-xl p-2 flex flex-col gap-1 max-h-64 overflow-y-auto"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {AVAILABLE_NETWORKS.map((net) => (
                  <button
                    key={net.id}
                    onClick={() => {
                      setSelectedNetwork(net);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition ${
                      selectedNetwork?.id === net.id
                        ? "bg-primary text-white"
                        : "text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    <Image
                      src={net.icon || "/wallets/polkadot.svg"}
                      alt={net.name}
                      width={22}
                      height={22}
                      className="rounded-full"
                    />
                    <div className="flex flex-col text-left">
                      <span className="text-white">{net.name}</span>
                      <span className="text-gray-400 text-xs">{net.symbol}</span>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {isWrongNetwork && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              You are currently connected to{" "}
              <span className="font-semibold">{currentChain?.name}</span>.
              <br />
              Please switch your wallet network to{" "}
              <span className="font-semibold">{selectedNetwork?.name}</span>.
            </div>
          )}

          {/* Map / Unmap Button */}
          <button
            onClick={handleMapUnmap}
            disabled={
              !hasRevive ||
              loading ||
              isMapped == null ||
              isWrongNetwork
            }
            className={`w-full py-2 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
              !hasRevive || isWrongNetwork
                ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                : loading
                ? "bg-[#1A1D23] cursor-wait"
                : isMapped
                ? "bg-red-600 hover:bg-red-700"
                : "bg-[#1A1D23] hover:bg-white/10"
            }`}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {!hasRevive
              ? "This chain does not support mapping"
              : isWrongNetwork
              ? "Wrong network"
              : loading
              ? "Processing..."
              : isMapped
              ? "Unmap"
              : "Map"}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
