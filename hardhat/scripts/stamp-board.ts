/**
 * Stamp three independent slips on a live Ticket Window.
 *
 *   PREDICT_ADDRESS=0x... ORACLE_URL=https://.../tape.json \
 *     pnpm exec hardhat run scripts/stamp-board.ts
 *
 * The TEE fetches ORACLE_URL (not localhost). jq paths: .price / .btc
 */
import { connectRitual, explorerTx } from "./ritual.ts";

const address = process.env.PREDICT_ADDRESS;
if (!address) throw new Error("Set PREDICT_ADDRESS to the deployed window.");

const oracleUrl = process.env.ORACLE_URL ?? "";
if (!oracleUrl.startsWith("https://") && !oracleUrl.startsWith("http://")) {
  throw new Error("ORACLE_URL must be a public http(s) URL. The TEE cannot reach this laptop.");
}
if (oracleUrl.includes("localhost") || oracleUrl.includes("127.0.0.1")) {
  throw new Error("Loopback is scratched on-chain. Point the tape at a public URL.");
}

const slips = [
  {
    question: "Does ETH print 4000+ at the bell?",
    jsonPath: ".price",
    target: 4000n,
    comparator: 1,
    bettingSeconds: 180n,
    resolveDelaySeconds: 60n,
  },
  {
    question: "Is the tape still under 8000 when we close?",
    jsonPath: ".price",
    target: 8000n,
    comparator: 2,
    bettingSeconds: 240n,
    resolveDelaySeconds: 90n,
  },
  {
    question: "Does BTC print 50000 on the side board?",
    jsonPath: ".btc",
    target: 50000n,
    comparator: 1,
    bettingSeconds: 300n,
    resolveDelaySeconds: 120n,
  },
] as const;

const { connection, publicClient, viem } = await connectRitual();
const predict = await viem.getContractAt("RitualPredict", address as `0x${string}`);

const executionBalance = await predict.read.executionBalance();
if (executionBalance === 0n) {
  console.warn("! Escrow is empty — the bell will skip. Seat fundExecution first.");
}

for (const s of slips) {
  const params = { ...s, oracleUrl };
  console.log(`Stamp: ${params.question}`);
  const hash = await predict.write.createMarket([params]);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const id = await predict.read.marketCount();
  const row = await predict.read.getMarket([id]);
  console.log(`  slip #${id}  close ${row.closeBlock}  bell ${row.resolveBlock}  ${explorerTx(hash)}`);
  console.log(`  mined in block ${receipt.blockNumber}`);
}

const board = await predict.read.getMarkets();
console.log(`Board now holds ${board.length} slips.`);

await connection.close();
