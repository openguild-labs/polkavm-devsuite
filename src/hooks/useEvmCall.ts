// hooks/useEvmCall.ts
import { useState, useEffect, useRef } from 'react';
import { useSendTransaction, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { Hash } from 'viem'; 

interface UseEvmCallProps {
  to: `0x${string}`;  
  value: string;  
}

export function useEvmCall({ to, value }: UseEvmCallProps) {
  const [txHash, setTxHash] = useState<Hash | undefined>();
  const receiptResolverRef = useRef<((receipt: any) => void) | null>(null);
  
  const { sendTransaction, isPending: isSending, error: sendError, reset } = useSendTransaction({
    mutation: {
      onSuccess: (hash) => {
        console.log("🎉 Transaction success callback triggered");
        console.log("- Transaction hash:", hash);
        setTxHash(hash);
      },
      onError: (error) => {
        console.error("💥 Transaction error callback triggered:", error);
      
      },
    },
  });
  const { data: txReceipt, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
  });
  const { data: balance, isLoading: isLoadingBalance, refetch: refetchBalance } = useBalance();

  // Log transaction receipt when received and resolve promise
  useEffect(() => {
    if (txReceipt) {
      console.log("TxHash:", txHash);
      console.log("📋 Transaction receipt received:");
      console.log("- Receipt:", txReceipt);
      console.log("- Status:", txReceipt.status);
      console.log("- Block number:", txReceipt.blockNumber);
      
      // Resolve the waiting promise if it exists
      if (receiptResolverRef.current) {
        console.log("🔓 Resolving receipt promise");
        receiptResolverRef.current(txReceipt);
        receiptResolverRef.current = null;
      }
    }
  }, [txReceipt, txHash]);

  const execute = async (): Promise<Hash> => {
    console.log("🔄 useEvmCall.execute() called");
    console.log("- to:", to);
    console.log("- value:", value);
    console.log("- parsed value:", parseEther(value));
    console.log("- isSending:", isSending);
    console.log("- sendError:", sendError);
    
    return new Promise((resolve, reject) => {
      console.log("📤 Sending transaction...");
      
      // Send the transaction
      sendTransaction(
        {
          to,
          value: parseEther(value),
        },
        {
          onSuccess: (hash) => {
            console.log("✅ Transaction sent successfully, hash:", hash);
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

  const waitForReceipt = async (): Promise<any> => {
    console.log("⏳ waitForReceipt called");
    
    // If receipt already exists, return it immediately
    if (txReceipt) {
      console.log("✅ Receipt already available:", txReceipt);
      return txReceipt;
    }
    
    // Otherwise, wait for it
    return new Promise((resolve) => {
      console.log("🔒 Setting up receipt promise resolver");
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