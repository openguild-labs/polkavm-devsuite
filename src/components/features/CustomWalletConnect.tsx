"use client"

import { useState } from "react"
import { useAccount, useConnect, useDisconnect } from "@luno-kit/react"
import { AnimatePresence, motion } from "framer-motion"
import Image from "next/image"
import { useConnectModal } from "@rainbow-me/rainbowkit" 
import { useConnectModal as useLunoConnectModal } from '@luno-kit/ui';
import { Zap } from "lucide-react"
import Link from "next/link"

export default function CustomWalletConnect() {
  const { account } = useAccount()
  const { connect } = useConnect()
  const { disconnect, isPending } = useDisconnect()
  const { openConnectModal } = useConnectModal() 
  const [open, setOpen] = useState(false)
  const [subModal, setSubModal] = useState<null | "polkadot">(null)
  const lunoConnectModal = useLunoConnectModal();

  const handleOpen = () => setOpen(true)
  const handleClose = () => {
    setOpen(false)
    setSubModal(null)
  }

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
      {/* Header */}
      <header className="h-16 sticky top-0 z-50 flex items-center bg-transparent">
        <div className="container mx-auto px-4 flex items-center justify-between">
          {/* Left */}
          <Link href="/" className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold text-white">PolkaVM Tools</h1>
            </div>
          </Link>
          {/* Right */}
          <div className="flex items-center gap-4">
            {!account ? (
              <button
                onClick={handleOpen}
                className="px-5 py-2.5 rounded-xl text-white font-semibold border border-white/20 
                          bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-white/40
                          transition-all shadow-sm hover:shadow-md"
              >
                Connect Wallet
              </button>
            ) : (
              <div className="flex items-center gap-3">
                {/*Address*/}
                <span
                  className="px-3 py-1.5 rounded-lg bg-white/10 text-white font-medium 
                            border border-white/20 backdrop-blur-sm"
                >
                  {account.address.slice(0, 6)}…{account.address.slice(-4)}
                </span>

                {/*Disconnect*/}
                <button
                  onClick={() => disconnect()}
                  disabled={isPending}
                  className="px-3 py-1.5 rounded-lg text-red-300 font-medium 
                            bg-red-500/10 border border-red-500/20
                            hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-200
                            transition-all disabled:opacity-50"
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
              className="fixed inset-0 z-[9999]"
              onClick={handleClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />

            {/* Sidebar */}
            <motion.div
              className="fixed top-0 right-0 h-full w-[420px] z-[10000] p-6 flex flex-col bg-card border-l border-border rounded-l-xl"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.28 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">Connect Your Wallet</h2>
                <button onClick={handleClose} className="text-gray-400 hover:text-white text-xl">×</button>
              </div>

              {/* Networks */}
              <div className="space-y-4 mt-2">
                {/* Polkadot */}
                <div className="token-card-hover flex items-center justify-between bg-card p-4 rounded-2xl border border-border">
                  <div className="flex items-center gap-3">
                    <Image src="/wallets/polkadot.svg" alt="Polkadot" width={36} height={36} />
                    <div>
                      <div className="text-white font-medium">Polkadot</div>
                      <div className="text-gray-400 text-xs">Use Polkadot-compatible wallets</div>
                    </div>
                  </div>
                  <button
                    onClick={handleConnectPolkadot}
                    className="px-4 py-1.5 bg-primary/10 hover:bg-primary/20 rounded-xl text-sm text-white transition-colors"
                  >
                    Connect
                  </button>
                </div>

                {/* Ethereum */}
                <div className="token-card-hover flex items-center justify-between bg-card p-4 rounded-2xl border border-border">
                  <div className="flex items-center gap-3">
                    <Image src="/wallets/ethereum.svg" alt="Ethereum" width={36} height={36} />
                    <div>
                      <div className="text-white font-medium">Ethereum</div>
                      <div className="text-gray-400 text-xs">Use EVM-compatible wallets</div>
                    </div>
                  </div>
                  <button
                    onClick={handleConnectEthereum}
                    className="px-4 py-1.5 bg-primary/10 hover:bg-primary/20 rounded-xl text-sm text-white transition-colors"
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
