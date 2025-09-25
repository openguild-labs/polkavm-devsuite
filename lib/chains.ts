import * as SPECS from "polkadot-api/chains";

export interface ChainConfig {
  name: string;
  displayName: string;
  wsUrls: readonly string[];
  chainSpec: () => Promise<{ chainSpec: any }>;
  descriptorName: string;
  isTestnet?: boolean;
  symbol: string;
  decimals: number;
}

// Basic chain configurations for PAPI learning
export const supportedChains = {
  polkadot: {
    name: "polkadot",
    displayName: "Polkadot",
    symbol: "DOT",
    decimals: 10,
    wsUrls: [
      "wss://rpc.polkadot.io",
      "wss://polkadot.api.onfinality.io/public-ws",
    ],
    chainSpec: () => import("polkadot-api/chains/polkadot"),
    descriptorName: "polkadot",
    isTestnet: false,
  },
  kusama: {
    name: "kusama",
    displayName: "Kusama",
    symbol: "KSM",
    decimals: 12,
    wsUrls: [
      "wss://kusama-rpc.polkadot.io",
      "wss://kusama.api.onfinality.io/public-ws",
    ],
    chainSpec: () => import("polkadot-api/chains/ksmcc3"),
    descriptorName: "kusama",
    isTestnet: false,
  },
  westend: {
    name: "westend",
    displayName: "Westend",
    symbol: "WND",
    decimals: 12,
    wsUrls: [
      "wss://westend-rpc.polkadot.io",
      "wss://westend.api.onfinality.io/public-ws",
    ],
    chainSpec: () => import("polkadot-api/chains/westend2"),
    descriptorName: "westend",
    isTestnet: true,
  },
  paseo: {
    name: "paseo",
    displayName: "Paseo",
    symbol: "PAS",
    decimals: 10,
    wsUrls: ["wss://paseo-rpc.dwellir.com", "wss://paseo.dotters.network"],
    chainSpec: () => import("polkadot-api/chains/paseo"),
    descriptorName: "paseo",
    isTestnet: true,
  },
  paseoah: {
    name: "paseoah",
    displayName: "Paseo Asset Hub",
    symbol: "PAS",
    decimals: 10,
    wsUrls: ["wss://asset-hub-paseo-rpc.n.dwellir.com", "wss://pas-rpc.stakeworld.io/assethub"],
    chainSpec: () => import("polkadot-api/chains/paseo_asset_hub"),
    descriptorName: "paseoah",
    isTestnet: true,
  }
} as const;

export type SupportedChain = keyof typeof supportedChains;

export function getChainConfig(chainName: SupportedChain): ChainConfig {
  return supportedChains[chainName];
}

// Simple utility to randomize RPC endpoints for load balancing
export function shuffleArray<T>(array: T[]): T[] {
  return array
    .map((v) => ({ v, p: Math.random() }))
    .sort((a, b) => a.p - b.p)
    .map(({ v }) => v);
}

// Format balance with proper decimals and symbol
export function formatBalance(
  amount: bigint | string,
  chainName: SupportedChain,
): string {
  const { decimals, symbol } = supportedChains[chainName];
  const balance = Number(amount) / Math.pow(10, decimals);
  return `${balance.toFixed(4)} ${symbol}`;
}
