import { POLKAVM_CHAINS } from "@/constants";

// Mapping Substrate → EVM
export const SUBSTRATE_TO_EVM: Record<string, number> = {
  "AssetHub Kusama": 420420418,
  "AssetHub Westend": 420420421,
  "PAassetHub": 420420422,
};

// Mapping EVM → Substrate
export const EVM_TO_SUBSTRATE: Record<number, string> = {
  420420418: "AssetHub Kusama",
  420420421: "AssetHub Westend",
  420420422: "PAassetHub",
};

export const EVM_CHAIN_ICONS: Record<number, string> = {
  420420422: POLKAVM_CHAINS.passet.chainIconUrl,
  420420421: POLKAVM_CHAINS.wah.chainIconUrl,
  420420418: POLKAVM_CHAINS.kah.chainIconUrl
};

