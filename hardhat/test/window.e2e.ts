import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { getAddress, parseEther, stringToHex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const AGENDA = "0x56e776BAE2DD60664b69Bd5F865F1180ffB7D58B" as const;
const TILL = "0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948" as const;
const ROSTER = "0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F" as const;
const WIRE = "0x0000000000000000000000000000000000000801" as const;
const CUT = "0x0000000000000000000000000000000000000803" as const;
const NODE = getAddress("0x0000000000000000000000000000000000000bbb");

describe("window e2e", async function () {
  const { viem, networkHelpers } = await network.create();
  const pub = await viem.getPublicClient();
  const test = await viem.getTestClient();
  const annA = privateKeyToAccount(generatePrivateKey());
  const benA = privateKeyToAccount(generatePrivateKey());
  await test.setBalance({ address: annA.address, value: parseEther("80") });
  await test.setBalance({ address: benA.address, value: parseEther("80") });
  const ann = await viem.getWalletClient(annA);
  const ben = await viem.getWalletClient(benA);

  async function paint(name: string, addr: `0x${string}`) {
    const d = await viem.deployContract(name);
    const code = await pub.getCode({ address: d.address });
    assert.ok(code && code !== "0x", name);
    await test.setCode({ address: addr, bytecode: code });
    return viem.getContractAt(name, addr);
  }

  async function booth() {
    const agenda = await paint("FakeAgenda", AGENDA);
    await paint("FakeTill", TILL);
    const roster = await paint("FakeRoster", ROSTER);
    const wire = await paint("FakeWire", WIRE);
    const cut = await paint("FakeCut", CUT);
    await roster.write.set([NODE, true]);
    await wire.write.set([200, stringToHex('{"price":4300}'), ""]);
    await cut.write.set([4300n]);
    const win = await viem.deployContract("RitualPredict", [1000n]);
    await win.write.fundExecution([20n], { value: parseEther("1") });
    return { win, agenda, wire };
  }

  const slip = {
    question: "Does ETH print 4000+ at the bell?",
    oracleUrl: "https://tape.example/eth",
    jsonPath: ".price",
    target: 4000n,
    comparator: 1,
    bettingSeconds: 30n,
    resolveDelaySeconds: 15n,
  } as const;

  it("yes ticket 3 vs no 1 pays 4", async function () {
    const { win, agenda } = await booth();
    await win.write.createMarket([slip]);
    const id = await win.read.marketCount();
    await win.write.bet([id, true], { account: ann.account, value: parseEther("3") });
    await win.write.bet([id, false], { account: ben.account, value: parseEther("1") });
    const row = await win.read.getMarket([id]);
    const now = await pub.getBlockNumber();
    if (row.resolveBlock > now) await networkHelpers.mine(Number(row.resolveBlock - now));
    await agenda.write.ping([row.scheduleId, 0n]);
    const done = await win.read.getMarket([id]);
    assert.equal(done.state, 3);
    assert.equal(done.outcome, 1);
    const before = await pub.getBalance({ address: ann.account.address });
    const h = await win.write.claimWinnings([id], { account: ann.account });
    const rec = await pub.waitForTransactionReceipt({ hash: h });
    const after = await pub.getBalance({ address: ann.account.address });
    assert.equal(after + rec.gasUsed * rec.effectiveGasPrice - before, parseEther("4"));
  });

  it("three dead wires void and refund 2", async function () {
    const { win, agenda, wire } = await booth();
    await wire.write.kill([true]);
    await win.write.createMarket([slip]);
    const id = await win.read.marketCount();
    await win.write.bet([id, true], { account: ann.account, value: parseEther("2") });
    const row = await win.read.getMarket([id]);
    const now = await pub.getBlockNumber();
    if (row.resolveBlock > now) await networkHelpers.mine(Number(row.resolveBlock - now));
    await agenda.write.ping([row.scheduleId, 0n]);
    await agenda.write.ping([row.scheduleId, 1n]);
    await agenda.write.ping([row.scheduleId, 2n]);
    assert.equal((await win.read.getMarket([id])).state, 4);
    const before = await pub.getBalance({ address: ann.account.address });
    const h = await win.write.claimRefund([id], { account: ann.account });
    const rec = await pub.waitForTransactionReceipt({ hash: h });
    const after = await pub.getBalance({ address: ann.account.address });
    assert.equal(after + rec.gasUsed * rec.effectiveGasPrice - before, parseEther("2"));
  });

  it("two windows keep their own pots", async function () {
    const { win, agenda } = await booth();
    const late = {
      ...slip,
      question: "Does the late race print 3500?",
      target: 3500n,
      bettingSeconds: 300n,
    };
    await win.write.createMarket([slip]);
    const first = await win.read.marketCount();
    await win.write.createMarket([late]);
    const second = await win.read.marketCount();
    await win.write.bet([first, true], { account: ann.account, value: parseEther("3") });
    await win.write.bet([second, false], { account: ben.account, value: parseEther("2") });
    const row = await win.read.getMarket([first]);
    const now = await pub.getBlockNumber();
    if (row.resolveBlock > now) await networkHelpers.mine(Number(row.resolveBlock - now));
    await agenda.write.ping([row.scheduleId, 0n]);
    const done = await win.read.getMarket([first]);
    const other = await win.read.getMarket([second]);
    assert.equal(done.state, 3);
    assert.equal(done.outcome, 1);
    assert.equal(other.state, 0);
    assert.equal(other.totalNo, parseEther("2"));
    assert.equal(other.totalYes, 0n);
    const board = await win.read.getMarkets();
    assert.equal(board.length, 2);
    assert.equal(board[0].id, second);
  });
});
