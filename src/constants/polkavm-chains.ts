import { Chain } from '@rainbow-me/rainbowkit';
import { POLKAVM_CHAINS } from '@/constants';

const passethub: Chain = {
  id: POLKAVM_CHAINS.passet.chainId,
  name: POLKAVM_CHAINS.passet.displayName,
  nativeCurrency: {
    decimals: POLKAVM_CHAINS.passet.decimals,
    name: POLKAVM_CHAINS.passet.displayName,
    symbol: POLKAVM_CHAINS.passet.symbol,
  },
  rpcUrls: {
    default: {
      http: [POLKAVM_CHAINS.passet.rpcUrl],
    },
  },
  testnet: true,
};

const wnd: Chain = {
  id: POLKAVM_CHAINS.wah.chainId,
  name: POLKAVM_CHAINS.wah.displayName,
  nativeCurrency: {
    decimals: POLKAVM_CHAINS.wah.decimals,
    name: POLKAVM_CHAINS.wah.displayName,
    symbol: POLKAVM_CHAINS.wah.symbol,
  },
  rpcUrls: {
    default: {
      http: [POLKAVM_CHAINS.wah.rpcUrl],
    },
  },
  testnet: true,
};

const kah: Chain = {
  id: POLKAVM_CHAINS.kah.chainId,
  name: POLKAVM_CHAINS.kah.displayName,
  nativeCurrency: {
    decimals: POLKAVM_CHAINS.kah.decimals,
    name: POLKAVM_CHAINS.kah.displayName,
    symbol: POLKAVM_CHAINS.kah.symbol,
  },
  rpcUrls: {
    default: {
      http: [POLKAVM_CHAINS.kah.rpcUrl],
    },
  },
  testnet: false,
};

export const POLKAVM_RAINBOW_CHAINS = [passethub, wnd, kah] as const;