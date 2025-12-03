'use client'

import { useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { useAccount as usePolkadotAccount } from "@luno-kit/react"
import { useAccount as useEvmAccount } from "wagmi"
import { useWalletSidebar } from "@/stores/useWalletSidebar"
import MapAccountModal from "@/components/features/MapAccountModal"

export default function HomePage() {
  const { account: polkadotAccount } = usePolkadotAccount()
  const { address: evmAddress } = useEvmAccount()
  const { openSidebar } = useWalletSidebar()

  const [openMapModal, setOpenMapModal] = useState(false)

  const handleMapAccountClick = (e: React.MouseEvent) => {
    e.preventDefault() 
    const isConnected = polkadotAccount || evmAddress

    if (!isConnected) {
      openSidebar("map") 
    } else {
      setOpenMapModal(true) 
    }
  }

  return (
    <div className="min-h-screen network-grid">
      <div className="w-full max-w-6xl mx-auto px-6 py-20">

        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-white tracking-tight">
            PolkaVM Tools
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
            Essential blockchain development tools for Ethereum and Substrate chains.
            Build smarter, debug faster, and ship with confidence.
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">

          {/* Bridge Tool */}
          <ToolCard
            href="/bridge"
            title="Bridge Substrate → PolkaVM"
            description="Transfer tokens from Substrate chains into PolkaVM with seamless integration."
          />

          {/* Map Account Tool */}
          <Card
            className="token-card-hover p-8 rounded-xl bg-card border border-border h-full relative overflow-hidden cursor-pointer"
            onClick={handleMapAccountClick}
          >
            <CardContent className="p-0 flex flex-col gap-4 relative z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Map Account</h2>
                <ArrowRight className="w-6 h-6 text-gray-400 transition-all duration-300 group-hover:translate-x-1 group-hover:text-white" />
              </div>
              <p className="text-gray-400 text-base">
                Connect and map a Substrate account to a PolkaVM account securely.
              </p>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Map Account Modal */}
      {openMapModal && (
        <MapAccountModal onClose={() => setOpenMapModal(false)} />
      )}
    </div>
  )
}

/* Reusable ToolCard */
function ToolCard({
  href,
  title,
  description,
}: {
  href: string
  title: string
  description: string
}) {
  return (
    <Link href={href} className="group">
      <Card className="token-card-hover p-8 rounded-xl bg-card border border-border h-full relative overflow-hidden">
        <CardContent className="p-0 flex flex-col gap-4 relative z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            <ArrowRight className="w-6 h-6 text-gray-400 transition-all duration-300 group-hover:translate-x-1 group-hover:text-white" />
          </div>
          <p className="text-gray-400 text-base">{description}</p>
        </CardContent>
      </Card>
    </Link>
  )
}
