import { createConfig, http } from "wagmi";
import { defineChain } from "viem";
import { injected } from "wagmi/connectors";
import type { Address } from "viem";

export const chainId = Number(process.env.NEXT_PUBLIC_RITUAL_CHAIN_ID ?? "1979");
export const rpc = process.env.NEXT_PUBLIC_RITUAL_RPC_URL ?? "https://rpc.ritualfoundation.org";
const raw = process.env.NEXT_PUBLIC_PREDICT_ADDRESS?.trim();
export const windowAddr: Address | undefined =
  raw && /^0x[0-9a-fA-F]{40}$/.test(raw) ? (raw as Address) : undefined;
export const explorer = "https://explorer.ritualfoundation.org";
export const faucet = "https://faucet.ritualfoundation.org";
export const tunnel = process.env.NEXT_PUBLIC_DEMO_ORACLE_URL?.trim() ?? "";

export const ritual = defineChain({
  id: chainId,
  name: "Ritual",
  nativeCurrency: { name: "Ritual", symbol: "RITUAL", decimals: 18 },
  rpcUrls: { default: { http: [rpc] } },
  blockExplorers: { default: { name: "scan", url: explorer } },
});

export const cfg = createConfig({
  chains: [ritual],
  connectors: [injected({ shimDisconnect: true })],
  // SubWallet (and friends) announce via EIP-6963 then throw
  // "source has not been authorized yet" on localhost. Don't probe them.
  multiInjectedProviderDiscovery: false,
  ssr: true,
  transports: { [ritual.id]: http(rpc) },
});
