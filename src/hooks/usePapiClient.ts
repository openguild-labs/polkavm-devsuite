import { useAccount, usePapiSigner, useChain, useChains } from "@luno-kit/react";
import { Binary, createClient } from "polkadot-api";
import { getWsProvider } from "polkadot-api/ws-provider/web";
import { useEffect, useState } from "react";
import { ss58ToH160 } from "@/lib/utils";
import { POLKAVM_TO_POLKADOT } from "@/config/chainMapping";
import { CHAINS } from "@/constants";
import { kah, passet_hub, wah } from "@polkadot-api/descriptors";


export interface PapiClientState {
  client: any;
  isReady: boolean;
  error: Error | null;
  currentChain: any | null;
}

export function usePapiClient() {
  const { data: papiSigner } = usePapiSigner();
  const { address } = useAccount();
  const { chain: connectedChain } = useChain();
  const chains = useChains(); 

  const [state, setState] = useState<PapiClientState>({
    client: null,
    isReady: false,
    error: null,
    currentChain: null,
  });

  const [balance, setBalance] = useState({ total: "0", formattedTotal: "0" });
  const [loadingBalance, setLoadingBalance] = useState(false);

  // Mapping PolkaVM chainId → descriptors
  const getDescriptorsForConnectedChain = (connectedChain: any) => {
    if (!connectedChain) return {};

    const match = Object.entries(POLKAVM_TO_POLKADOT).find(
      ([evmId, hash]) => hash === connectedChain.genesisHash
    );

    if (!match) return {};

    const polkadotChainHash = match[1];
    switch (polkadotChainHash) {
      case CHAINS.paseoPassetHub.genesisHash:
        return passet_hub;
      case CHAINS.westendAssetHub.genesisHash:
        return wah;
      case CHAINS.kusamaAssetHub.genesisHash:
        return kah;
      default:
        return {};
    }
  };

  // Init PAPI client
  const initializeClient = async (chain: any) => {
    if (!chain) return;
    try {
      if (state.client) state.client.destroy();

      setState((prev) => ({ ...prev, isReady: false, currentChain: chain }));

      const client = createClient(
        getWsProvider(chain.rpcUrls?.webSocket?.[0], (_status) => {
          switch (_status.type) {
            case 0:
              console.info("⚫️ Connecting to ==> ", chain.name);
              break;
            case 1:
              console.info("🟢 Provider connected ==> ", chain.name);
              setState((prev) => ({ ...prev, isReady: true, error: null }));
              break;
            case 2:
              console.info("🔴 Provider error ==> ", chain.name);
              break;
            case 3:
              console.info("🟠 Provider closed ==> ", chain.name);
              break;
          }
        })
      );

      setState((prev) => ({ ...prev, client }));
    } catch (error) {
      console.error("Failed to initialize PAPI client:", error);
      setState((prev) => ({
        ...prev,
        isReady: false,
        error: error instanceof Error ? error : new Error("Unknown error"),
      }));
    }
  };

  // balance
  const fetchBalance = async (addr: string, client: any, chain: any) => {
    if (!addr || !client || !chain) return;
    setLoadingBalance(true);

    try {
      const accountInfo = await client
        .getTypedApi(chain.descriptors)
        .query.System.Account.getValue(addr);

      const decimals = chain.nativeCurrency?.decimals || 12;
      const total = BigInt(accountInfo.data.free) - BigInt(accountInfo.data.frozen || 0);
      const formattedTotal = (Number(total) / 10 ** decimals).toFixed(4);

      setBalance({ total: total.toString(), formattedTotal });
    } catch (error) {
      console.error("Failed to fetch balance:", error);
    } finally {
      setLoadingBalance(false);
    }
  };

  // Map account
  const mapAccount = async (): Promise<{ transactionHash: string; status: string; errorMessage: string | null }> => {
  const { currentChain, client, isReady } = state;
  if (!isReady || !currentChain || !papiSigner) throw new Error("Client not ready");

  const tx = client.getTypedApi(currentChain.descriptors).tx.Revive.map_account();

  return new Promise((resolve, reject) => {
    const subscription = tx.signSubmitAndWatch(papiSigner).subscribe({
      next: (event: any) => {
        console.log("🔹 MapAccount TX Event:", event); 
        if (event.type === "txInBlock") {
          console.log("✅ Transaction included in block:", event.txHash);
        }
        if (event.type === "txBestBlocksState") {
          console.log("🎉 MapAccount FINALIZED:", event.txHash);
          subscription.unsubscribe();
          resolve({ status: "success", transactionHash: event.txHash, errorMessage: null });
        }
      },
      error: (error: any) => {
        subscription.unsubscribe();
        console.error("❌ MapAccount FAILED:", error);
        reject({ status: "failed", transactionHash: "", errorMessage: error?.message || "Unknown error" });
      },
    });
  });
};


  // Check mapped account
  const isMappedAccount = async (evmAddress: string): Promise<boolean> => {
  const { currentChain, client, isReady } = state;
  if (!isReady || !currentChain) return false;

  try {
    const h160 = Binary.fromHex(evmAddress);

    const value = await client
      .getTypedApi(currentChain.descriptors)
      .query.Revive.OriginalAccount.getValue(h160);

    console.log("🔍 isMappedAccount result:", value);
    return value !== undefined && value !== null;
  } catch (err) {
    console.error("isMappedAccount failed:", err);
    return false;
  }
};

  // Deposit account
  const depositAccount = async (to: string, value: string): Promise<{ transactionHash: string; status: string; errorMessage: string | null }> => {
    const { currentChain, client, isReady } = state;
    if (!isReady || !currentChain || !papiSigner) throw new Error("Client not ready");

    const decimals = currentChain.nativeCurrency?.decimals || 12;
    const amountInPlanck = BigInt(parseFloat(value) * 10 ** decimals);

    const tx = client.getTypedApi(currentChain.descriptors).tx.Revive.call({
      dest: Binary.fromHex(to),
      value: amountInPlanck,
      gas_limit: { ref_time: BigInt(1e12), proof_size: BigInt(1e6) },
      storage_deposit_limit: BigInt(1000000000000000),
      data: Binary.fromHex("0x"),
    });

    return new Promise((resolve, reject) => {
      const subscription = tx.signSubmitAndWatch(papiSigner).subscribe({
        next: (event: any) => {
          console.log("Deposit tx event type:", event.type);
          console.log("Deposit tx event data:", event.data);
          if (event.type === "txBestBlocksState") {
            subscription.unsubscribe();
            client
          .getTypedApi(currentChain.descriptors)
          .query.System.Account.getValue(to)
          .then((recipientInfo: any) => {
            const total = BigInt(recipientInfo.data.free) - BigInt(recipientInfo.data.frozen || 0);
            console.log(`Recipient balance on ${currentChain.name}:`, (Number(total) / 10 ** decimals).toFixed(4));
          })
          .catch((err: any) => {
            console.error("Failed to fetch recipient balance:", err);
          });

            resolve({ status: "success", transactionHash: event.txHash, errorMessage: null });
          }
        },
        error: (error: any) => {
          subscription.unsubscribe();
          console.error("Deposit tx error:", error);
          reject(error);
        },
      });
    });
  };

  const switchChain = async () => {
    if (!connectedChain) return;

    const descriptors = getDescriptorsForConnectedChain(connectedChain);

    const chainForPapi = {
      ...connectedChain,
      descriptors,
    };

    await initializeClient(chainForPapi);
  };

  // connectedChain -> init client
  useEffect(() => {
    if (connectedChain) switchChain();
  }, [connectedChain]);

  // address or client -> fetch balance
  useEffect(() => {
    if (address && state.client && state.isReady && state.currentChain) {
      fetchBalance(address, state.client, state.currentChain);
    }
  }, [address, state.client, state.isReady, state.currentChain]);

  return {
    ...state,
    balance,
    loadingBalance,
    refreshBalance: () => {
      if (address && state.client && state.currentChain) {
        fetchBalance(address, state.client, state.currentChain);
      }
    },
    mapAccount,
    depositAccount,
    isMappedAccount,
    switchChain, 
  };
}
