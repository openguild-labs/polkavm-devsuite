import { useEffect, useState, useCallback } from "react";

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
  signer: any;
  address: string | undefined;
  initialMapped?: boolean;
  descriptors: any;
}): {
  isMapped: boolean | null;
  loading: boolean;
  hasRevive: boolean;
  map: () => Promise<void>;
  unmap: () => Promise<void>;
  refresh: () => Promise<void>;
} {
  const [isMapped, setIsMapped] = useState<boolean | null>(
    initialMapped ?? null
  );
  const [loading, setLoading] = useState(false);
  const [hasRevive, setHasRevive] = useState(false);

  const fetchMappedStatus = useCallback(async () => {

    if (!client || !chain || !address) return;
    
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

      const value = await api.query.Revive.OriginalAccount.getValue(address);
      setIsMapped(!!value);
    } catch (err) {
      console.error("Failed to fetch mapped status:", err);
      setHasRevive(false);
      setIsMapped(null);
    } finally {
      setLoading(false);
    }
  }, [client, chain, address]);

  const map = async () => {
    if (!client || !chain || !signer) return;
    setLoading(true);
    try {
      await client
        .getTypedApi(descriptors)
        .tx.Revive.mapAccount()
        .signSubmitAndWatch(signer);
      await fetchMappedStatus();
    } finally {
      setLoading(false);
    }
  };

  const unmap = async () => {
    if (!client || !chain || !signer) return;
    setLoading(true);
    try {
      await client
        .getTypedApi(descriptors)
        .tx.Revive.unmapAccount()
        .signSubmitAndWatch(signer);
      await fetchMappedStatus();
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
