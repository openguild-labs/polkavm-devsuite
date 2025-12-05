"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { ChevronDown, ChevronUp, X } from "lucide-react";

import {
  useChain,
  useChains,
  useAccount as usePolkadotAccount,
} from "@luno-kit/react";

interface MapAccountModalProps {
  onClose: () => void;
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

  const [isMapped, setIsMapped] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<any | null>(null);

  if (!polkadotAccount) return null;

  const AVAILABLE_NETWORKS = chains.map((c) => ({
    id: c.genesisHash,
    name: c.name,
    symbol: c.nativeCurrency?.symbol || "",
    icon: c.chainIconUrl,      
    raw: c,
  }));

  const handleMapUnmap = async () => {
    if (!selectedNetwork) {
      alert("Please select a network first.");
      return;
    }

    setIsProcessing(true);
    await new Promise((res) => setTimeout(res, 600)); 
    setIsMapped((prev) => !prev);
    setIsProcessing(false);
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
          onClick={onClose}
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
              onClick={onClose}
              className="text-gray-400 hover:text-white text-xl"
            >
              <X />
            </button>
          </div>

          {/* Account Info Block */}
          <div
            className="flex items-center justify-between p-3 rounded-xl border border-white/10 cursor-pointer hover:bg-white/5"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
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
                  {shortenAddress(polkadotAccount?.address || "")}
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
                      <span className="text-gray-400 text-xs">
                        {net.symbol}
                      </span>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Map/Unmap Button */}
          <button
            onClick={handleMapUnmap}
            disabled={isProcessing}
            className={`w-full py-2 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 ${
              isMapped
                ? "bg-red-600 hover:bg-red-700 text-white border border-white"
                : "bg-[#1A1D23] hover:bg-white/10 text-white border border-white"
            }`}
          >
            {isProcessing ? "Processing..." : isMapped ? "Unmap" : "Map"}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
