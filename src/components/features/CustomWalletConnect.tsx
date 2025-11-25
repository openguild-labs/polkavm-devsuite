"use client"

import { useState } from "react"
import { useAccount, useConnect, useDisconnect } from "@luno-kit/react"
import { AnimatePresence, motion } from "framer-motion"
import Image from "next/image"
import { useConnectModal } from "@rainbow-me/rainbowkit" 
import { useConnectModal as useLunoConnectModal } from '@luno-kit/ui';
import { Zap } from "lucide-react"

export default function CustomWalletConnect() {
  const { account } = useAccount()
  const { connect } = useConnect()
  const { disconnect, isPending } = useDisconnect()
  const { openConnectModal } = useConnectModal() 
  const [open, setOpen] = useState(false)
  const [subModal, setSubModal] = useState<null | "polkadot">(null)

  const handleOpen = () => setOpen(true)
  const handleClose = () => {
    setOpen(false)
    setSubModal(null)
  }
  const lunoConnectModal = useLunoConnectModal();

  const handleConnectPolkadot = () => {
    setOpen(false); 
    lunoConnectModal.open?.(); 
  };

  const handleConnectEthereum = () => {
    handleClose()      
    openConnectModal?.() 
  }

  return (
    <>
    <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
      <div className="container mx-auto px-4 pt-2 pb-4 flex items-center justify-between">
        {/* Left content */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-balance">PolkaVM Bridge</h1>
        </div>

        {/* Right content */}
        <div className="flex items-center gap-4">
          {!account ? (
            <button
              onClick={handleOpen}
              className="px-4 py-2 rounded-md text-white font-medium hover:bg-white/10 transition-colors"
            >
              Connect Wallet
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span>{account.address.slice(0, 6)}…{account.address.slice(-4)}</span>
              <button
                onClick={() => disconnect()}
                disabled={isPending}
                className="px-3 py-1 border rounded"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
      
      {/* Sidebar Drawer */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black/50 z-[999999]"
              onClick={handleClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Sidebar */}
            <motion.div
              className="fixed top-0 right-0 h-full w-[420px] bg-[#0F1115] z-[1000000] p-6 flex flex-col border-l border-white/10"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.28 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Connect Your Wallet</h2>
                <button onClick={handleClose} className="text-gray-400 hover:text-white text-xl">×</button>
              </div>

              {/* Networks List */}
              <div className="space-y-4 mt-2">
                {/* Polkadot */}
                <div className="flex items-center justify-between bg-[#15171C] p-4 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <Image src="/wallets/polkadot.svg" alt="Polkadot" width={36} height={36} />
                    <div>
                      <div className="text-white font-medium">Polkadot</div>
                      <div className="text-gray-400 text-xs">Use Polkadot-compatible wallets</div>
                    </div>
                  </div>
                  <button
                    onClick={handleConnectPolkadot}
                    className="px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm"
                  >
                    Connect
                  </button>
                </div>

                {/* Ethereum */}
                <div className="flex items-center justify-between bg-[#15171C] p-4 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <Image src="/wallets/ethereum.svg" alt="Ethereum" width={36} height={36} />
                    <div>
                      <div className="text-white font-medium">Ethereum</div>
                      <div className="text-gray-400 text-xs">Use EVM-compatible wallets</div>
                    </div>
                  </div>
                  <button
                    onClick={handleConnectEthereum}
                    className="px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm"
                  >
                    Connect
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
