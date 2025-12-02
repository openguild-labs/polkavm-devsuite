'use client'

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import Image from "next/image"
import { X } from "lucide-react"
import { useAccount as usePolkadotAccount } from "@luno-kit/react"

interface MapAccountModalProps {
  onClose: () => void
}

function shortenAddress(address: string, start = 3, end = 3) {
  if (!address) return ""
  if (address.length <= start + end + 3) return address
  return `${address.slice(0, start)}...${address.slice(-end)}`
}

export default function MapAccountModal({ onClose }: MapAccountModalProps) {
  const { account: polkadotAccount } = usePolkadotAccount()

  const [isMapped, setIsMapped] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  if (!polkadotAccount) return null

  const handleMapUnmap = async () => {
    setIsProcessing(true)
    await new Promise((res) => setTimeout(res, 1000))
    setIsMapped((prev) => !prev)
    setIsProcessing(false)
  }

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
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
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
            <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">
              <X />
            </button>
          </div>

          {/* Account Info */}
          <div className="flex items-center gap-4">
            <Image src="/wallets/polkadot.svg" alt="Polkadot" width={36} height={36} />
            <div className="flex flex-col">
              <span className="text-white font-medium">
                {shortenAddress(polkadotAccount?.address || "")}
              </span>
              <span className="text-gray-400 text-sm">Polkadot Account</span>
            </div>
          </div>

          {/* Map / Unmap Button */}
          <button
            onClick={handleMapUnmap}
            disabled={isProcessing}
            className={`w-full py-2 rounded-xl font-medium transition-colors ${
              isMapped ? "bg-red-600 hover:bg-red-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"
            }`}
          >
            {isProcessing ? "Processing..." : isMapped ? "Unmap" : "Map"}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
