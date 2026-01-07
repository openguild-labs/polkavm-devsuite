import { useAccount, usePapiSigner, useChain } from "@luno-kit/react";
import { Binary, createClient } from "polkadot-api";
import { getWsProvider } from "polkadot-api/ws-provider/web";
import { useEffect, useState } from "react";
import { convertSS58ToH160, ss58ToH160 } from "@/lib/utils";
import { CHAINS } from "@/constants";
import { kah, passet_hub, wah } from "@polkadot-api/descriptors";

/* ================= TYPES ================= */

export interface PapiClientState {
  client: any;
  isReady: boolean;
  error: Error | null;
  currentChain: any | null;
}

/* ================= HOOK ================= */

export function usePapiClient() {
  const { data: papiSigner } = usePapiSigner();
  const { address } = useAccount();
  const { chain: connectedChain } = useChain();

  const [state, setState] = useState<PapiClientState>({
    client: null,
    isReady: false,
    error: null,
    currentChain: null,
  });

  const [balance, setBalance] = useState({
    total: "0",
    formattedTotal: "0",
  });
  const [loadingBalance, setLoadingBalance] = useState(false);

  /* ================= HELPERS ================= */

  const getDescriptorsForConnectedChain = (chain: any) => {
    if (!chain?.genesisHash) return null;

    switch (chain.genesisHash) {
      case CHAINS.paseoPassetHub.genesisHash:
        return passet_hub;
      case CHAINS.westendAssetHub.genesisHash:
        return wah;
      case CHAINS.kusamaAssetHub.genesisHash:
        return kah;
      default:
        return null;
    }
  };

  const assertChainSupportsRevive = (client: any, chain: any) => {

    if (!client?.getTypedApi(chain.descriptors)?.tx?.Revive) {
      throw new Error(
        `Chain ${chain?.name} does NOT support Revive.mapAccount`
      );
    }
  };

  /* ================= INIT CLIENT ================= */

  const initializeClient = async (chain: any) => {
    if (!chain) return;

    try {
      if (state.client) {
        state.client.destroy();
      }

      setState((prev) => ({
        ...prev,
        isReady: false,
        currentChain: chain,
        error: null,
      }));

      const client = createClient(
        getWsProvider(chain.rpcUrls?.webSocket?.[0], (status) => {
          switch (status.type) {
            case 0:
              console.info("⚫️ Connecting to", chain.name);
              break;
            case 1:
              console.info("🟢 Connected to", chain.name);
              setState((prev) => ({ ...prev, isReady: true }));
              break;
            case 2:
              console.error("🔴 Provider error", chain.name);
              break;
            case 3:
              console.warn("🟠 Provider closed", chain.name);
              break;
          }
        })
      );

      setState((prev) => ({ ...prev, client }));
    } catch (err: any) {
      console.error("Init PAPI client failed:", err);
      setState((prev) => ({
        ...prev,
        isReady: false,
        error: err instanceof Error ? err : new Error("Unknown error"),
      }));
    }
  };

  /* ================= BALANCE ================= */

  const fetchBalance = async (addr: string) => {
    const { client, currentChain, isReady } = state;
    if (!addr || !client || !currentChain || !isReady) return;

    setLoadingBalance(true);
    try {
      const info = await client
        .getTypedApi(currentChain.descriptors)
        .query.System.Account.getValue(addr);

      const decimals = currentChain.nativeCurrency?.decimals || 12;
      const total =
        BigInt(info.data.free) - BigInt(info.data.frozen || 0n);

      setBalance({
        total: total.toString(),
        formattedTotal: (Number(total) / 10 ** decimals).toFixed(4),
      });
    } catch (err) {
      console.error("Fetch balance failed:", err);
    } finally {
      setLoadingBalance(false);
    }
  };

  /* ================= MAP ACCOUNT ================= */

  const isMappedAccount = async (): Promise<boolean> => {
    const { client, currentChain, isReady } = state;
    if (!client || !currentChain || !isReady || !address) {
      throw new Error("Client not ready or address missing");
    }

    const evmAddress = convertSS58ToH160(address);

    console.log(" Checking mapping...");
    console.log("Substrate address:", address);
    console.log("Derived EVM (H160):", evmAddress);
    console.log("Chain:", currentChain.name);


    const value = await client
      .getTypedApi(currentChain.descriptors)
      .query.Revive.OriginalAccount.getValue(Binary.fromHex(evmAddress));
    console.log(" Revive.OriginalAccount storage value:", value);
    const mapped = value !== undefined;
    console.log(" Is mapped?", mapped);

    return mapped;
  };

  const mapAccount = async (): Promise<{
    transactionHash: string;
    status: "success" | "already_mapped";
    errorMessage: string | null;
  }> => {
    const { client, currentChain, isReady } = state;
    if (!client || !currentChain || !isReady || !papiSigner || !address) {
      throw new Error("Client not ready");
    }

    console.log("Descriptors:", currentChain.descriptors);
    assertChainSupportsRevive(client, currentChain);

    const alreadyMapped = await isMappedAccount();
    if (alreadyMapped) {
      return {
        status: "already_mapped",
        transactionHash: "",
        errorMessage: null,
      };
    }
    const tx = client
      .getTypedApi(currentChain.descriptors)
      .tx.Revive.map_account();

    return new Promise((resolve, reject) => {
      const sub = tx.signSubmitAndWatch(papiSigner).subscribe({
        next: (event: any) => {
          if (event.type === "txBestBlocksState") {
            sub.unsubscribe();
            resolve({
              status: "success",
              transactionHash: event.txHash,
              errorMessage: null,
            });
          }
        },
        error: (err: any) => {
          sub.unsubscribe();
          reject(err);
        },
      });
    });
  };

  /* ================= DEPOSIT ================= */

  const depositAccount = async (
    to: string,
    value: string
  ): Promise<{
    transactionHash: string;
    status: string;
    errorMessage: string | null;
  }> => {
    const { client, currentChain, isReady } = state;
    if (!client || !currentChain || !isReady || !papiSigner) {
      throw new Error("Client not ready");
    }

    const decimals = currentChain.nativeCurrency?.decimals || 12;
    const amount = BigInt(Math.floor(Number(value) * 10 ** decimals));

    const tx = client
      .getTypedApi(currentChain.descriptors)
      .tx.Revive.call({
        dest: Binary.fromHex(to),
        value: amount,
        gas_limit: {
          ref_time: BigInt(1e12),
          proof_size: BigInt(1e6),
        },
        storage_deposit_limit: BigInt(1e15),
        data: Binary.fromHex("0x"),
      });

    return new Promise((resolve, reject) => {
      const sub = tx.signSubmitAndWatch(papiSigner).subscribe({
        next: (event: any) => {
          if (event.type === "txBestBlocksState") {
            sub.unsubscribe();
            resolve({
              status: "success",
              transactionHash: event.txHash,
              errorMessage: null,
            });
          }
        },
        error: (err: any) => {
          sub.unsubscribe();
          reject(err);
        },
      });
    });
  };

  /* ================= CHAIN SWITCH ================= */

  const switchChain = async () => {
    if (!connectedChain) return;

    const descriptors = getDescriptorsForConnectedChain(connectedChain);
    if (!descriptors) {
      throw new Error(
        `Unsupported chain for mapping: ${connectedChain.name}`
      );
    }

    await initializeClient({
      ...connectedChain,
      descriptors,
    });
  };

  /* ================= EFFECTS ================= */

  useEffect(() => {
    if (connectedChain) {
      switchChain();
    }
  }, [connectedChain]);

  useEffect(() => {
    if (address) {
      fetchBalance(address);
    }
  }, [address, state.client, state.isReady]);

  /* ================= EXPORT ================= */

  return {
    ...state,
    balance,
    loadingBalance,
    refreshBalance: () => address && fetchBalance(address),
    mapAccount,
    isMappedAccount,
    depositAccount,
    switchChain,
  };
}