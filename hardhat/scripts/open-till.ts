/**
 * Paint the doubles onto canonical Ritual slots, deploy the window, stamp three slips.
 *
 *   pnpm exec hardhat node --chain-id 1979
 *   pnpm exec hardhat run scripts/open-till.ts
 *
 * Public 1979 uses scripts/deploy.ts + scripts/stamp-board.ts instead.
 */
import { network } from "hardhat";
import { getAddress, parseEther, stringToHex } from "viem";

const AGENDA = "0x56e776BAE2DD60664b69Bd5F865F1180ffB7D58B" as const;
const TILL = "0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948" as const;
const ROSTER = "0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F" as const;
const WIRE = "0x0000000000000000000000000000000000000801" as const;
const CUT = "0x0000000000000000000000000000000000000803" as const;
const NODE = getAddress("0x0000000000000000000000000000000000000bbb");

const slips = [
  {
    question: "Does ETH print 4000+ at the bell?",
    oracleUrl: "https://tape.example/eth",
    jsonPath: ".price",
    target: 4000n,
    comparator: 1,
    bettingSeconds: 180n,
    resolveDelaySeconds: 60n,
  },
  {
    question: "Is the tape still under 8000 when we close?",
    oracleUrl: "https://tape.example/eth",
    jsonPath: ".price",
    target: 8000n,
    comparator: 2,
    bettingSeconds: 240n,
    resolveDelaySeconds: 90n,
  },
  {
    question: "Does BTC print 50000 on the side board?",
    oracleUrl: "https://tape.example/btc",
    jsonPath: ".btc",
    target: 50000n,
    comparator: 1,
    bettingSeconds: 300n,
    resolveDelaySeconds: 120n,
  },
] as const;

const connection = await network.create({ network: "booth", chainType: "l1" });
const { viem } = connection;
const pub = await viem.getPublicClient();
const test = await viem.getTestClient();

async function paint(name: string, addr: `0x${string}`) {
  const d = await viem.deployContract(name);
  const code = await pub.getCode({ address: d.address });
  if (!code || code === "0x") throw new Error(`no bytecode for ${name}`);
  await test.setCode({ address: addr, bytecode: code });
  return viem.getContractAt(name, addr);
}

const roster = await paint("FakeRoster", ROSTER);
const wire = await paint("FakeWire", WIRE);
const cut = await paint("FakeCut", CUT);
await paint("FakeAgenda", AGENDA);
await paint("FakeTill", TILL);
await roster.write.set([NODE, true]);
await wire.write.set([200, stringToHex('{"price":4300,"btc":97100}'), ""]);
await cut.write.set([4300n]);

const win = await viem.deployContract("RitualPredict", [1000n]);
await win.write.fundExecution([20_000n], { value: parseEther("1") });

for (const s of slips) {
  const hash = await win.write.createMarket([s]);
  await pub.waitForTransactionReceipt({ hash });
  const id = await win.read.marketCount();
  const row = await win.read.getMarket([id]);
  console.log(`slip #${id}  ${s.question}`);
  console.log(`  close ${row.closeBlock}  bell ${row.resolveBlock}`);
}

const board = await win.read.getMarkets();
console.log(`WINDOW=${win.address}`);
console.log(`BOARD=${board.length}`);

await connection.close();
