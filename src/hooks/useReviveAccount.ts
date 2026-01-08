import { convertSS58ToH160 } from "@/lib/utils";
import { Binary, PolkadotSigner } from "polkadot-api";
import { useEffect, useState, useCallback } from "react";


interface MapUnmapResult {
  transactionHash: string;
  status: "success" | "error";
  errorMessage: string | null;
}

export function useReviveAccount({
  client,
  chain,
  signer,
  address,
  initialMapped,
  descriptors,
}: {
  client: any;
  chain: any;
  signer: PolkadotSigner;
  address: string | undefined;
  initialMapped?: boolean;
  descriptors: any;
}): {
  isMapped: boolean | null;
  loading: boolean;
  hasRevive: boolean;
  map: () => Promise<MapUnmapResult>;
  unmap: () => Promise<MapUnmapResult>;
  refresh: () => Promise<void>;
} {
  const [isMapped, setIsMapped] = useState<boolean | null>(
    initialMapped ?? null
  );
  const [loading, setLoading] = useState(false);
  const [hasRevive, setHasRevive] = useState(false);

  const fetchMappedStatus = useCallback(async () => {

    if (!client || !chain || !address) return;

    console.log("fetchMappedStatus", client, chain, address);

    try {
      setLoading(true);

      const supportsMap = await client.getTypedApi(descriptors).tx.Revive.mapAccount;
      setHasRevive(supportsMap);

      if (!supportsMap) {
        setIsMapped(null);
        return;
      }

      if (client.isMappedAccount && address) {
        const mapped = await client.isMappedAccount(address);
        setIsMapped(mapped);
        return;
      }

      const api = client.getTypedApi(descriptors);
      if (!api?.query?.Revive?.OriginalAccount) {
        console.warn("Chain does not support Revive or OriginalAccount");
        setIsMapped(false);
        return;
      }

      const evmAddress = convertSS58ToH160(address);
      console.log("evmAddress", evmAddress);
      const value = await api.query.Revive.OriginalAccount.getValue(Binary.fromHex(evmAddress));
      console.log("value", value);
      setIsMapped(!!value);
    } catch (err) {
      console.error("Failed to fetch mapped status:", err);
      setHasRevive(false);
      setIsMapped(null);
    } finally {
      setLoading(false);
    }
  }, [client, chain, address]);

  const map = async (): Promise<{
    transactionHash: string;
    status: "success" | "error";
    errorMessage: string | null;
  }> => {
    if (!client || !chain || !signer) {
      return {
        status: "error",
        transactionHash: "",
        errorMessage: "Client not ready",
      };
    }
    setLoading(true);
    try {
      const tx = client
        .getTypedApi(descriptors)
        .tx.Revive.map_account();
      return new Promise((resolve, reject) => {
        const sub = tx.signSubmitAndWatch(signer).subscribe({
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

      // await fetchMappedStatus();
    } finally {
      setLoading(false);
    }
  };

  const unmap = async (): Promise<{
    transactionHash: string;
    status: "success" | "error";
    errorMessage: string | null;
  }> => {
    if (!client || !chain || !signer) {
      return {
        status: "error",
        transactionHash: "",
        errorMessage: "Client not ready",
      };
    }
    setLoading(true);
    try {
      const tx = await client
        .getTypedApi(descriptors)
        .tx.Revive.unmap_account();

      return new Promise((resolve, reject) => {
        const sub = tx.signSubmitAndWatch(signer).subscribe({
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
      // await fetchMappedStatus();
    } finally {
      setLoading(false);
    }
  };

  // Auto fetch 
  useEffect(() => {
    fetchMappedStatus();
  }, [fetchMappedStatus, descriptors]);

  return {
    isMapped,
    loading,
    map,
    unmap,
    hasRevive,
    refresh: fetchMappedStatus,
  };
}
