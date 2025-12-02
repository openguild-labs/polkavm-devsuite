'use client'

import { useState } from "react"
import { useAccount as usePolkadotAccount, useDisconnect as usePolkadotDisconnect } from "@luno-kit/react"
import { useAccount as useEvmAccount } from "wagmi"
import { AnimatePresence, motion } from "framer-motion"
import Image from "next/image"
import { Zap } from "lucide-react"
import { ConnectButton as RainbowKitConnectButton, useConnectModal as useRainbowConnectModal } from "@rainbow-me/rainbowkit"
import { ConnectButton as LunoConnectButton, useConnectModal as useLunoConnectModal } from "@luno-kit/ui"
import Link from "next/link"
import { useWalletNetwork } from "@/context/WalletContext"

export default function CustomWalletConnect() {
  // Polkadot hooks
  const { account: polkadotAccount } = usePolkadotAccount()
  const { disconnect: disconnectPolkadot, isPending: isPendingPolkadot } = usePolkadotDisconnect()

  // Ethereum hooks
  const { address: evmAddress } = useEvmAccount()
  const rainbowConnectModal = useRainbowConnectModal()
  const lunoConnectModal = useLunoConnectModal()

  const [open, setOpen] = useState(false)
 const { network, setNetwork } = useWalletNetwork()

  const handleOpen = () => setOpen(true)
  const handleClose = () => setOpen(false)

  const handleConnectPolkadot = () => {
    setNetwork("polkadot")
    setOpen(false)
    lunoConnectModal.open?.()
  }

  const handleConnectEthereum = () => {
    setNetwork("ethereum")
    setOpen(false)
    rainbowConnectModal.openConnectModal?.()
  }

  const handleDisconnect = () => {
    if (network === "polkadot") disconnectPolkadot()
    setNetwork(null)
    handleClose()
  }

  return (
    <>
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 pt-2 pb-4 flex items-center justify-between">
          {/* Left */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold text-balance">PolkaVM Bridge</h1>
            </Link>
          </div>

          {/* Right */}
          <div className="flex items-center gap-4">
            {(!polkadotAccount && !evmAddress) ? (
              <button
                onClick={handleOpen}
                className="px-4 py-2 rounded-md text-white font-medium border-2 border-white transition-all duration-300 hover:border-primary hover:shadow-[0_0_15px_var(--primary)] focus:outline-none focus:ring-2 focus:ring-primary"
              >
                Connect Wallet
              </button>
            ) : network === "polkadot" ? (
              <LunoConnectButton
                accountStatus="full"
                chainStatus="full"
                showBalance={false}
                displayPreference="name"
                className="bg-black text-black hover:text-black"
              />
            ) : network === "ethereum" ? (
              <RainbowKitConnectButton />
            ) : null}
          </div>
        </div>
      </header>

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
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-white text-xl"
                >
                  ×
                </button>
              </div>

              {/* Network selection when not connected */}
              {!polkadotAccount && !evmAddress && (
                <div className="space-y-4 mt-2">
                  {/* Polkadot */}
                  <div className="flex items-center justify-between bg-[#15171C] p-4 rounded-2xl border border-white/5 token-card-hover">
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
                  <div className="flex items-center justify-between bg-[#15171C] p-4 rounded-2xl border border-white/5 token-card-hover">
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
              )}

              {/* Connected info + Disconnect */}
              {(polkadotAccount || evmAddress) && (
                <div className="mt-auto pt-6 border-t border-white/10">
                  <div className="flex items-center gap-3 mb-4">
                    {network === "polkadot" && <Image src="/wallets/polkadot.svg" alt="Polkadot" width={24} height={24} />}
                    {network === "ethereum" && <Image src="/wallets/ethereum.svg" alt="Ethereum" width={24} height={24} />}
                    <span className="text-white font-medium">
                      {network === "polkadot" ? polkadotAccount?.address : evmAddress}
                    </span>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    disabled={network === "polkadot" ? isPendingPolkadot : false}
                    className="px-4 py-2 w-full bg-red-600 text-white rounded-md"
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
