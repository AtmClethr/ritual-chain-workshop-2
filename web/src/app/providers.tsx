"use client";
import { useState } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cfg } from "@/config/net";

export function Providers({ children }: { children: React.ReactNode }) {
  const [q] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={cfg}>
      <QueryClientProvider client={q}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
