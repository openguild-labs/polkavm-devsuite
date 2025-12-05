
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
