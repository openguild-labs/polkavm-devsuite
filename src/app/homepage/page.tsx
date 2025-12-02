'use client'
import { Card, CardContent } from "@/components/ui/card"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useSidebarStore } from "@/store/sidebarStore"
import { useAccount as usePolkadotAccount, useDisconnect as usePolkadotDisconnect } from "@luno-kit/react"
import { useAccount as useEvmAccount } from "wagmi"

export default function HomePage() {
  const { open } = useSidebarStore()
  const { account: polkadotAccount } = usePolkadotAccount()
  const { address: evmAddress } = useEvmAccount()

  const handleMapClick = () => {
  if (!polkadotAccount && !evmAddress) {
    open("connect")
  } else {
    open("map")
  }
}

  return (
    <div className="min-h-screen network-grid">
      {/* Hero Section */}
      <div className="w-full max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-white tracking-tight animate-fade-in-up">
            PolkaVM Tools
          </h1>
          <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto animate-fade-in-up animate-delay-100">
            Essential blockchain development tools for Ethereum and EVM-compatible chains. Build smarter, debug faster,
            and ship with confidence.
          </p>
        </div>

        {/* Main Tool Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">
          {/* Bridge Tool */}
          <Link href="/bridge" className="group">
            <Card className="token-card-hover p-8 rounded-xl bg-card border border-border h-full overflow-hidden relative">
              <CardContent className="p-0 flex flex-col gap-4 relative z-10">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">Bridge Substrate → PolkaVM</h2>
                  <ArrowRight className="w-6 h-6 text-gray-400 transition-all duration-300 group-hover:translate-x-1 group-hover:text-white" />
                </div>
                <p className="text-gray-400 text-base">
                  Transfer tokens from Substrate chains into PolkaVM with seamless integration.
                </p>
              </CardContent>
            </Card>
          </Link>

          {/* Map Account Tool */}
          
           <Card
            onClick={() => {
              console.log("Map Account clicked", polkadotAccount)
              handleMapClick()
            }}
              className="cursor-pointer token-card-hover p-8 rounded-xl bg-card border border-border h-full relative"
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
    </div>
  )
}
