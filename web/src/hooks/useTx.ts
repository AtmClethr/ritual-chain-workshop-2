"use client";
import { useCallback, useState } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import type { Abi, Address } from "viem";

export function useTx() {
  const { writeContractAsync, data: hash } = useWriteContract();
  const { isLoading } = useWaitForTransactionReceipt({ hash });
  const [err, setErr] = useState<string | null>(null);
  const [spin, setSpin] = useState(false);
  const go = useCallback(
    async (p: {
      address: Address;
      abi: Abi | readonly unknown[];
      functionName: string;
      args?: readonly unknown[];
      value?: bigint;
    }) => {
      setErr(null);
      setSpin(true);
      try {
        return await writeContractAsync(p as never);
      } catch (e) {
        const m = e instanceof Error ? e.message.split("\n")[0] : "no";
        setErr(m ?? "no");
        throw e;
      } finally {
        setSpin(false);
      }
    },
    [writeContractAsync],
  );
  return { go, hash, err, spin: spin || isLoading };
}
