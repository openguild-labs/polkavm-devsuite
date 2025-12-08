
import { useChains } from "@luno-kit/react";

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

// Map chainId PolkaVM → genesisHash chain Polkadot 
export const POLKAVM_TO_POLKADOT: Record<number, string> = {
  420420418: "0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a",
  420420421: "0x67f9723393ef76214df0118c34bbbd3dbebc8ed46a10973a8c969d48fe7598c9",
  420420422: "0xfd974cf9eaf028f5e44b9fdd1949ab039c6cf9cc54449b0b60d71b042e79aeb6",
};

export function useEvmChainIcons() {
  const chains = useChains();

  const iconMap: Record<number, string> = {};

  chains.forEach((polkadotChain) => {
    // Match genesisHash → chainId
    const match = Object.entries(POLKAVM_TO_POLKADOT).find(
      ([evmId, hash]) => hash === polkadotChain.genesisHash
    );

    if (match) {
      const evmChainId = Number(match[0]);

      //icon Polkadot chain
      if (polkadotChain.chainIconUrl) {
        iconMap[evmChainId] = polkadotChain.chainIconUrl;
      }
    }
  });

  return iconMap;
}

