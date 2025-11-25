import CustomWalletConnect from "@/components/features/CustomWalletConnect"
import { TokenBridge } from "@/components/features/TokenBridge"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <CustomWalletConnect />
      <TokenBridge />
    </main>
  )
}
