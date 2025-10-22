'use client';

import { RainbowKitProvider, connectorsForWallets } from '@rainbow-me/rainbowkit';
import { metaMaskWallet, walletConnectWallet } from '@rainbow-me/rainbowkit/wallets';
import { createConfig, WagmiProvider as WagmiProviderBase } from 'wagmi';
import { http } from 'viem';
import { POLKAVM_RAINBOW_CHAINS } from '@/constants/polkavm-chains';

const connectors = connectorsForWallets([
  {
    groupName: 'Recommended',
    wallets: [
      metaMaskWallet,
    ],
  },
], {
  appName: 'PolkaVM Bridge',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
});

const wagmiConfig = createConfig({
  chains: POLKAVM_RAINBOW_CHAINS,
  connectors,
  transports: {
    [POLKAVM_RAINBOW_CHAINS[0].id]: http(),
    [POLKAVM_RAINBOW_CHAINS[1].id]: http(),
    [POLKAVM_RAINBOW_CHAINS[2].id]: http(),
  },
});

export function WagmiProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProviderBase config={wagmiConfig}>
      <RainbowKitProvider>
        {children}
      </RainbowKitProvider>
    </WagmiProviderBase>
  );
}
