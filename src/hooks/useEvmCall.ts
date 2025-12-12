// hooks/useEvmCall.ts
import { useState, useEffect, useRef } from 'react';
import { useSendTransaction, useWaitForTransactionReceipt, useBalance, useAccount, useChainId } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { Hash } from 'viem'; 

interface UseEvmCallProps {
  to: `0x${string}`;  
  value: string;  
}

export function useEvmCall({ to, value }: UseEvmCallProps) {
  const [txHash, setTxHash] = useState<Hash | undefined>();
  const receiptResolverRef = useRef<((receipt: any) => void) | null>(null);

  const { address: evmAddress } = useAccount();
  const { sendTransaction, isPending: isSending, error: sendError, reset } =
    useSendTransaction({
      mutation: {
        onSuccess: (hash) => {
          console.log("🎉 Transaction success callback triggered");
          setTxHash(hash);
        },
        onError: (error) => {
          console.error("💥 Transaction error callback triggered:", error);
        },
      },
    });

  const { data: txReceipt, isLoading: isConfirming } =
    useWaitForTransactionReceipt({ hash: txHash });

  const { data: balance, isLoading: isLoadingBalance, refetch: refetchBalance } =
    useBalance({ address: evmAddress });

  useEffect(() => {
    if (txReceipt) {
      console.log("📋 Transaction receipt received:", txReceipt);

      if (receiptResolverRef.current) {
        receiptResolverRef.current(txReceipt);
        receiptResolverRef.current = null;
      }
    }
  }, [txReceipt]);

  const execute = async (): Promise<Hash> => {
    console.log("🔄 useEvmCall.execute() called");

    if (!value || value.trim() === "") {
      throw new Error("Invalid transaction value");
    }

    let weiValue;
    try {
      weiValue = parseEther(value.trim());
    } catch (err) {
      console.error("❌ parseEther error:", err);
      throw err;
    }

    return new Promise((resolve, reject) => {
      console.log("📤 Sending transaction...");

      sendTransaction(
        {
          to,
          value: weiValue,
        },
        {
          onSuccess: (hash) => {
            console.log("✅ Transaction sent, hash:", hash);
            resolve(hash);
          },
          onError: (error) => {
            console.error("❌ Transaction failed:", error);
            reject(error);
          },
        }
      );
    });
  };

  const waitForReceipt = async () => {
    if (txReceipt) return txReceipt;

    return new Promise((resolve) => {
      receiptResolverRef.current = resolve;
    });
  };

  const resetTransaction = () => {
    setTxHash(undefined);
    reset();
  };

  return {
    execute,
    waitForReceipt,
    txHash,
    txReceipt,
    isSending,
    isConfirming,
    isSuccess: !!txReceipt,
    error: sendError,
    resetTransaction,
    to,
    value,
    isReady: !isSending && !sendError,
    isLoading: isSending || isConfirming,
    balance:
      balance
        ? {
            total: balance.value.toString(),
            formattedTotal: formatEther(balance.value),
            symbol: balance.symbol,
            decimals: balance.decimals,
          }
        : null,
    isLoadingBalance,
    refetchBalance,
  };
}
