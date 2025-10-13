import type { HexString } from '@luno-kit/react/types';
import { passet_hub, kah, wah, paseo } from '@polkadot-api/descriptors';

export interface Chain {
    name: string;
    id: string;
    genesisHash: HexString;
    rpcUrls: {
        webSocket: string[];
    };
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
    ss58Format: number;
    chainIconUrl: string;
    testnet: boolean;
    descriptors: any;
    blockExplorers: {
        default: {
            name: string;
            url: string;
        };
    };
}

export const CHAINS: Record<string, Chain> = {
    paseoPassetHub: {
        genesisHash: '0xfd974cf9eaf028f5e44b9fdd1949ab039c6cf9cc54449b0b60d71b042e79aeb6',
        name: 'PAassetHub',
        id: 'paseoPassetHub',
        nativeCurrency: { name: 'PassetHub', symbol: 'PAS', decimals: 10 },
        rpcUrls: {
            webSocket: ['wss://testnet-passet-hub.polkadot.io', 'wss://passet-hub-paseo.ibp.network'],
        },
        ss58Format: 0,
        chainIconUrl: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/pasero-asset-hub.svg",
        testnet: true,
        descriptors: passet_hub,
        blockExplorers: { default: { name: 'Subscan', url: 'https://assethub-paseo.subscan.io' } },
    },
    westendAssetHub: {
        genesisHash: '0x67f9723393ef76214df0118c34bbbd3dbebc8ed46a10973a8c969d48fe7598c9',
        name: 'AssetHub Westend',
        id: 'westendAssetHub',
        nativeCurrency: { name: 'AssetHub Westend', symbol: 'WND', decimals: 12 },
        rpcUrls: {
            webSocket: [
                'wss://westend-asset-hub-rpc.polkadot.io',
                'wss://asset-hub-westend-rpc.n.dwellir.com',
            ],
        },
        ss58Format: 42,
        blockExplorers: { default: { name: 'Subscan', url: 'https://assethub-westend.subscan.io' } },
        chainIconUrl: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/polkadot-asset-hub.svg",
        testnet: true,
        descriptors: wah,
    },
    kusamaAssetHub: {
        genesisHash: '0x48239ef607d7928874027a43a67689209727dfb3d3dc5e5b03a39bdc2eda771a',
        name: 'AssetHub Kusama',
        id: 'kusamaAssetHub',
        nativeCurrency: { name: 'AssetHub Kusama', symbol: 'KSM', decimals: 12 },
        rpcUrls: {
            webSocket: [
                'wss://kusama-asset-hub-rpc.polkadot.io',
                'wss://asset-hub-kusama-rpc.n.dwellir.com',
            ],
        },
        ss58Format: 2,
        blockExplorers: { default: { name: 'Subscan', url: 'https://assethub-kusama.subscan.io' } },
        chainIconUrl: "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/chains/kusama-asset-hub.svg",
        testnet: false,
        descriptors: kah,
    }
};

