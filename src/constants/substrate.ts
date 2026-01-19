import { kah, wah, passet_hub } from "@polkadot-api/descriptors";
import { CHAINS } from "@/constants";

export function getDescriptorForChain(chain: any) {
  if (!chain?.genesisHash) return null;

  switch (chain.genesisHash) {
    case CHAINS.kusamaAssetHub.genesisHash:
      return kah;
    case CHAINS.westendAssetHub.genesisHash:
      return wah;
    case CHAINS.paseoPassetHub.genesisHash:
      return passet_hub;
    default:
      return null;
  }
}
