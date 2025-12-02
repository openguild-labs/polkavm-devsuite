"use client"
import CustomWalletConnect from "@/components/features/CustomWalletConnect";
import { TokenBridge } from "@/components/features/TokenBridge";
import { WalletNetworkProvider } from "@/context/WalletContext";

export default function BridgePage() {
  return (
    <main className="min-h-screen bg-background">
      <WalletNetworkProvider>
        <CustomWalletConnect />
        <TokenBridge />
      </WalletNetworkProvider>
    </main>
  );
}
