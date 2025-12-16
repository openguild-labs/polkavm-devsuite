"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { ChevronDown, ChevronUp, X } from "lucide-react";

import {
  useChain,
  useChains,
  useAccount as usePolkadotAccount,
} from "@luno-kit/react";

import { createClient } from "polkadot-api";
import { getWsProvider } from "polkadot-api/ws-provider/web";
import { Binary } from "polkadot-api";
import { useAccountMap } from "@/context/AccountMap";

/* ---------------- utils ---------------- */
function shortenAddress(address: string, start = 4, end = 4) {
  if (!address) return "";
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

/* ---------------- component ---------------- */
interface MapAccountModalProps {
  onClose: () => void;
  evmAddress?: string;
}

export default function MapAccountModal({
  onClose,
  evmAddress,
}: MapAccountModalProps) {
  const { account: polkadotAccount } = usePolkadotAccount();
  const { chain: currentChain } = useChain();
  const chains = useChains();

  // ---------------- context ----------------
  const { mappedAccounts, setMappedAccount } = useAccountMap();
  const isMapped = evmAddress ? mappedAccounts[evmAddress] : null;

  const [selectedNetwork, setSelectedNetwork] = useState<any | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // ---------------- filter networks ----------------
  const AVAILABLE_NETWORKS = useMemo(() => {
    return (chains as any[])
      .filter((c) => c.hasRevive)
      .map((c) => ({
        id: c.genesisHash,
        name: c.name,
        icon: c.chainIconUrl,
        raw: c,
      }));
  }, [chains]);

  const selectedChain = selectedNetwork?.raw;

  // ---------------- check mapped ----------------
  const checkIsMapped = async (chain: any): Promise<boolean> => {
    try {
      if (!evmAddress) return false;
      const wsUrl = chain?.rpcUrls?.webSocket?.[0];
      let descriptors = chain?.descriptors;
      if (!wsUrl || !descriptors) return false;

      // unwrap Promise if needed
      if (typeof descriptors?.then === "function") {
        descriptors = await descriptors;
      } else if (descriptors?.descriptors && typeof descriptors.descriptors.then === "function") {
        descriptors = await descriptors.descriptors;
      }

      const client = createClient(getWsProvider(wsUrl));
      const api = client.getTypedApi(descriptors);
      const reviveQuery = (api.query as any)?.Revive?.OriginalAccount;
      if (!reviveQuery) return false;

      const h160 = Binary.fromHex(evmAddress);
      const original = await reviveQuery.getValue(h160);
      return original !== undefined && original !== null;
    } catch (e) {
      console.warn("checkIsMapped failed:", e);
      return false;
    }
  };

  // ---------------- auto check mapping ----------------
  useEffect(() => {
    if (!selectedChain || !evmAddress) return;

    setMappedAccount(evmAddress, null); 
    checkIsMapped(selectedChain)
      .then((mapped) => setMappedAccount(evmAddress, mapped))
      .catch(() => setMappedAccount(evmAddress, false));
  }, [selectedChain, evmAddress, setMappedAccount]);

  // ---------------- map / unmap ----------------
  const handleMapUnmap = async () => {
    if (!polkadotAccount || !selectedChain || !evmAddress) return;

    try {
      setIsProcessing(true);

      const wsUrl = selectedChain?.rpcUrls?.webSocket?.[0];
      let descriptors = selectedChain?.descriptors;
      if (!wsUrl || !descriptors) throw new Error("Chain does not support Revive");

      if (typeof descriptors?.then === "function") {
        descriptors = await descriptors;
      } else if (descriptors?.descriptors && typeof descriptors.descriptors.then === "function") {
        descriptors = await descriptors.descriptors;
      }

      const client = createClient(getWsProvider(wsUrl));
      const api = client.getTypedApi(descriptors);

      const reviveTx = (api.tx as any)?.Revive;
      if (!reviveTx) throw new Error("Revive pallet not found");

      const call = isMapped ? reviveTx.unmapAccount() : reviveTx.mapAccount();
      await call.signAndSubmit(polkadotAccount);

      // check again & update context
      const mapped = await checkIsMapped(selectedChain);
      setMappedAccount(evmAddress, mapped);

      console.log(`✅ ${isMapped ? "Unmapped" : "Mapped"} ${evmAddress} on ${selectedChain.name}`);
    } catch (e) {
      console.error("Map/Unmap failed:", e);
      alert("Transaction failed");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!polkadotAccount) return null;

  // ---------------- UI ----------------
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100000] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* backdrop */}
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />

        {/* modal */}
        <motion.div
          className="relative w-[420px] rounded-2xl bg-[#0F1115] p-6 text-white shadow-xl"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
        >
          {/* header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Map Account</h2>
            <button onClick={onClose}>
              <X />
            </button>
          </div>

          {/* account */}
          <div
            className="mt-5 flex cursor-pointer items-center justify-between rounded-xl border border-white/10 p-3"
            onClick={() => setIsDropdownOpen((p) => !p)}
          >
            <div className="flex items-center gap-3">
              <Image
                src={
                  selectedNetwork?.icon ||
                  currentChain?.chainIconUrl ||
                  "/wallets/polkadot.svg"
                }
                alt="chain"
                width={32}
                height={32}
                className="rounded-full"
              />
              <div>
                <div className="font-medium">{shortenAddress(polkadotAccount.address)}</div>
                <div className="text-sm text-gray-400">{selectedNetwork?.name || "Select network"}</div>
              </div>
            </div>
            {isDropdownOpen ? <ChevronUp /> : <ChevronDown />}
          </div>

          {/* dropdown */}
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-[#1A1D23]"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                {AVAILABLE_NETWORKS.map((net) => (
                  <button
                    key={net.id}
                    onClick={() => {
                      setSelectedNetwork(net);
                      setIsDropdownOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2 hover:bg-white/10"
                  >
                    <Image
                      src={net.icon || "/wallets/polkadot.svg"}
                      alt={net.name}
                      width={20}
                      height={20}
                    />
                    <span>{net.name}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* status */}
          {isMapped !== null && (
            <div className="mt-4 text-sm text-gray-400">
              Status:{" "}
              <span className={isMapped ? "text-green-400" : "text-yellow-400"}>
                {isMapped ? "Mapped" : "Not mapped"}
              </span>
            </div>
          )}

          {/* button */}
          <button
            disabled={isProcessing || isMapped === null}
            onClick={handleMapUnmap}
            className={`mt-5 w-full rounded-xl py-2 font-medium transition ${
              isMapped ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
            } disabled:opacity-50`}
          >
            {isProcessing ? "Processing..." : isMapped ? "Unmap" : "Map"}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
