// hooks/useEvmCall.ts
import { useState } from 'react';
import { useSendTransaction, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { Hash } from 'viem'; 

interface UseEvmCallProps {
  to: `0x${string}`;  
  value: string;  
}

export function useEvmCall({ to, value }: UseEvmCallProps) {
  const [txHash, setTxHash] = useState<Hash | undefined>();
  const { sendTransaction, isPending: isSending, error: sendError, reset } = useSendTransaction({
    mutation: {
      onSuccess: (hash) => {
        setTxHash(hash);
      },
    },
  });
  const { data: txReceipt, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
  });
  const { data: balance, isLoading: isLoadingBalance, refetch: refetchBalance } = useBalance();

  const execute = async () => {
    try {
      await sendTransaction({
        to,
        value: parseEther(value),
      });
    } catch (err) {
      console.error('EVM Call failed:', err);
      throw err;
    }
  };

  const resetTransaction = () => {
    setTxHash(undefined);
    reset();
  };

  return {
    execute, 
    txHash,
    txReceipt,
    isSending,
    isConfirming,
    isSuccess: !!txReceipt,
    error: sendError,
    resetTransaction,
    // Balance related
    balance: balance ? {
      total: balance.value.toString(),
      formattedTotal: formatEther(balance.value),
      symbol: balance.symbol,
      decimals: balance.decimals,
    } : null,
    isLoadingBalance,
    refetchBalance,
  };
}