"use client";

import { useEffect, useState } from "react";
import { formatEther, parseEther } from "viem";
import { useAccount, useConnect, useDisconnect, useReadContract } from "wagmi";
import { explorer, faucet, tunnel, windowAddr } from "@/config/net";
import { ticketAbi } from "@/abi/ticket";
import { useTx } from "@/hooks/useTx";

const CMP = { gt: 0, gte: 1, lt: 2, lte: 3 } as const;
const MARK = ["＞", "≥", "＜", "≤"] as const;
const PHASE = ["LIVE", "CLOSED", "READING", "PAID", "SCRATCH"] as const;

type Row = {
  id: bigint;
  creator: `0x${string}`;
  question: string;
  oracleUrl: string;
  jsonPath: string;
  target: bigint;
  comparator: number;
  closeBlock: bigint;
  resolveBlock: bigint;
  scheduleId: bigint;
  totalYes: bigint;
  totalNo: bigint;
  state: number;
  outcome: number;
  attempts: number;
  observedValue: bigint;
  invalidReason: string;
};

function rit(n?: bigint) {
  if (n === undefined) return "—";
  return `${Number(formatEther(n)).toFixed(3)} RIT`;
}

export default function WindowPage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const tx = useTx();
  const wired = Boolean(windowAddr);

  const { data: rows, refetch } = useReadContract({
    address: windowAddr,
    abi: ticketAbi,
    functionName: "getMarkets",
    query: { enabled: wired, refetchInterval: 7000 },
  });
  const { data: till } = useReadContract({
    address: windowAddr,
    abi: ticketAbi,
    functionName: "executionBalance",
    query: { enabled: wired, refetchInterval: 8000 },
  });
  const list = (rows as Row[] | undefined) ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 font-[family-name:var(--f-sans)]">
      <header className="flex items-end justify-between border-b border-[var(--gold)] pb-4">
        <div>
          <p className="font-[family-name:var(--f-mono)] text-[10px] tracking-[0.4em] text-[var(--gold)]">
            RITUAL 1979 · BOOTH
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">Ticket Window</h1>
          <p className="mt-1 text-sm text-[var(--cyan)]">
            Clerk hours. You sell the slip. The tape settles it.
          </p>
        </div>
        <div className="font-[family-name:var(--f-mono)] text-xs">
          {isConnected ? (
            <button className="text-[var(--gold)]" onClick={() => disconnect()}>
              {address?.slice(0, 6)}…{address?.slice(-4)}
            </button>
          ) : (
            <button
              className="rounded border border-[var(--gold)] px-3 py-1 text-[var(--gold)]"
              onClick={() => connectors[0] && connect({ connector: connectors[0] })}
            >
              Open till
            </button>
          )}
          <div className="mt-2 text-right opacity-80">escrow {rit(till as bigint | undefined)}</div>
          <a className="block text-right underline opacity-70" href={faucet} target="_blank" rel="noreferrer">
            faucet
          </a>
        </div>
      </header>

      {!wired && (
        <p className="mt-6 rounded border border-[var(--gold)]/40 bg-[var(--panel)] px-3 py-2 text-sm">
          After deploy, set NEXT_PUBLIC_PREDICT_ADDRESS in web/.env.local.
        </p>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3 rounded-lg border border-white/10 bg-[var(--panel)] p-5">
          <h2 className="font-[family-name:var(--f-mono)] text-xs tracking-widest text-[var(--gold)]">
            ISSUE A SLIP
          </h2>
          <Issue ready={isConnected && wired} tx={tx} onDone={() => void refetch()} />
        </section>
        <aside className="lg:col-span-2 space-y-6">
          <Escrow ready={isConnected && wired} tx={tx} />
          <Tape />
        </aside>
      </div>

      <section className="mt-10">
        <h2 className="font-[family-name:var(--f-mono)] text-xs tracking-widest text-[var(--gold)]">BOARD</h2>
        <div className="mt-3 space-y-4">
          {list.length === 0 && <p className="text-sm opacity-60">No slips yet.</p>}
          {list.map((r) => (
            <Slip key={r.id.toString()} row={r} me={address} ready={isConnected && wired} tx={tx} onDone={() => void refetch()} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Issue({
  ready,
  tx,
  onDone,
}: {
  ready: boolean;
  tx: ReturnType<typeof useTx>;
  onDone: () => void;
}) {
  const [q, setQ] = useState("Does ETH print 4000+ at the bell?");
  const [url, setUrl] = useState(tunnel);
  const [path, setPath] = useState(".price");
  const [target, setTarget] = useState("4000");
  const [cmp, setCmp] = useState<keyof typeof CMP>("gte");
  const [bet, setBet] = useState("180");
  const [delay, setDelay] = useState("60");
  const loop = /localhost|127\.0\.0\.1/i.test(url);

  return (
    <form
      className="mt-4 space-y-3 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (!windowAddr) return;
        void tx
          .go({
            address: windowAddr,
            abi: ticketAbi,
            functionName: "createMarket",
            args: [
              {
                question: q,
                oracleUrl: url,
                jsonPath: path,
                target: BigInt(target || "0"),
                comparator: CMP[cmp],
                bettingSeconds: BigInt(bet || "0"),
                resolveDelaySeconds: BigInt(delay || "0"),
              },
            ],
          })
          .then(onDone)
          .catch(() => undefined);
      }}
    >
      <input className="w-full rounded bg-black/30 px-3 py-2" value={q} onChange={(e) => setQ(e.target.value)} />
      <input
        className="w-full rounded bg-black/30 px-3 py-2 font-[family-name:var(--f-mono)] text-xs"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://…/api/oracle/eth"
      />
      {loop && <p className="text-xs text-red-400">Loopback is scratched on-chain. Tunnel the tape.</p>}
      <div className="grid grid-cols-2 gap-2">
        <input className="rounded bg-black/30 px-3 py-2" value={path} onChange={(e) => setPath(e.target.value)} />
        <input className="rounded bg-black/30 px-3 py-2" type="number" value={target} onChange={(e) => setTarget(e.target.value)} />
        <select className="rounded bg-black/30 px-3 py-2" value={cmp} onChange={(e) => setCmp(e.target.value as keyof typeof CMP)}>
          <option value="gte">≥ target</option>
          <option value="gt">＞ target</option>
          <option value="lt">＜ target</option>
          <option value="lte">≤ target</option>
        </select>
        <input className="rounded bg-black/30 px-3 py-2" type="number" value={bet} onChange={(e) => setBet(e.target.value)} />
        <input className="rounded bg-black/30 px-3 py-2" type="number" value={delay} onChange={(e) => setDelay(e.target.value)} />
      </div>
      <button disabled={!ready || tx.spin} className="w-full rounded bg-[var(--gold)] py-2 font-medium text-[var(--navy)] disabled:opacity-40">
        Stamp + schedule
      </button>
      {tx.err && <p className="text-xs text-red-400">{tx.err}</p>}
    </form>
  );
}

function Escrow({ ready, tx }: { ready: boolean; tx: ReturnType<typeof useTx> }) {
  const [amt, setAmt] = useState("0.35");
  return (
    <div className="rounded-lg border border-white/10 bg-[var(--panel)] p-5">
      <h2 className="font-[family-name:var(--f-mono)] text-xs tracking-widest text-[var(--gold)]">ESCROW</h2>
      <p className="mt-2 text-xs opacity-70">Pays Scheduler + HTTP, not the slip.</p>
      <input className="mt-3 w-full rounded bg-black/30 px-3 py-2" value={amt} onChange={(e) => setAmt(e.target.value)} />
      <button
        disabled={!ready || tx.spin}
        className="mt-3 w-full rounded border border-[var(--gold)] py-2 text-sm text-[var(--gold)] disabled:opacity-40"
        onClick={() => {
          if (!windowAddr) return;
          void tx
            .go({
              address: windowAddr,
              abi: ticketAbi,
              functionName: "fundExecution",
              args: [400000n],
              value: parseEther(amt || "0"),
            })
            .catch(() => undefined);
        }}
      >
        Seat escrow
      </button>
    </div>
  );
}

function Tape() {
  const [px, setPx] = useState<number | null>(null);
  const [edit, setEdit] = useState("4300");
  async function load() {
    const r = await fetch("/api/oracle/eth", { cache: "no-store" });
    const j = (await r.json()) as { price: number };
    setPx(j.price);
  }
  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 4000);
    return () => clearInterval(id);
  }, []);
  const yes = (px ?? 0) >= 4000;
  return (
    <div className="rounded-lg border border-white/10 bg-[var(--panel)] p-5">
      <h2 className="font-[family-name:var(--f-mono)] text-xs tracking-widest text-[var(--gold)]">TAPE</h2>
      <div className="mt-2 flex items-end justify-between">
        <div className="font-[family-name:var(--f-mono)] text-4xl text-[var(--cyan)]">{px ?? "—"}</div>
        <div className="text-right text-xs">
          vs 4000
          <div className={yes ? "text-emerald-400" : "text-rose-400"}>{yes ? "YES" : "NO"}</div>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <input className="flex-1 rounded bg-black/30 px-2 py-1" value={edit} onChange={(e) => setEdit(e.target.value)} />
        <button
          className="rounded border border-[var(--cyan)] px-3 text-xs text-[var(--cyan)]"
          onClick={() => {
            void fetch("/api/oracle/eth", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ price: Number(edit) }),
            }).then(load);
          }}
        >
          Print
        </button>
      </div>
      <p className="mt-2 break-all font-[family-name:var(--f-mono)] text-[10px] opacity-50">
        {tunnel || "tunnel /api/oracle/eth before live"}
      </p>
    </div>
  );
}

function Slip({
  row,
  me,
  ready,
  tx,
  onDone,
}: {
  row: Row;
  me?: `0x${string}`;
  ready: boolean;
  tx: ReturnType<typeof useTx>;
  onDone: () => void;
}) {
  const [stake, setStake] = useState("0.05");
  const pool = row.totalYes + row.totalNo;
  const yesPct = pool === 0n ? 50 : Number((row.totalYes * 1000n) / pool) / 10;
  const { data: mine } = useReadContract({
    address: windowAddr,
    abi: ticketAbi,
    functionName: "stakesOf",
    args: me ? [row.id, me] : undefined,
    query: { enabled: Boolean(windowAddr && me) },
  });
  const [, , settled, claimable] = (mine as readonly [bigint, bigint, boolean, bigint] | undefined) ?? [
    0n, 0n, false, 0n,
  ];
  function act(name: string, args: readonly unknown[], value?: bigint) {
    if (!windowAddr) return;
    void tx.go({ address: windowAddr, abi: ticketAbi, functionName: name, args, value }).then(onDone).catch(() => undefined);
  }
  return (
    <article className="rounded-lg border border-white/10 bg-[var(--panel)] p-4">
      <div className="flex justify-between gap-3">
        <h3 className="text-lg">{row.question}</h3>
        <span className="font-[family-name:var(--f-mono)] text-[10px] text-[var(--gold)]">
          {PHASE[row.state]} {row.outcome === 1 ? "YES" : row.outcome === 2 ? "NO" : ""}
        </span>
      </div>
      <div className="mt-3 h-1 bg-white/10">
        <div className="h-1 bg-emerald-400" style={{ width: `${yesPct}%` }} />
      </div>
      <p className="mt-2 font-[family-name:var(--f-mono)] text-[11px] opacity-70">
        obs {MARK[row.comparator]} {row.target.toString()} · {rit(row.totalYes)} YES / {rit(row.totalNo)} NO
      </p>
      {row.state === 0 && (
        <div className="mt-3 flex gap-2">
          <input className="w-24 rounded bg-black/30 px-2 text-sm" value={stake} onChange={(e) => setStake(e.target.value)} />
          <button
            disabled={!ready || tx.spin}
            className="flex-1 rounded bg-emerald-700 py-1 text-sm disabled:opacity-40"
            onClick={() => act("bet", [row.id, true], parseEther(stake || "0"))}
          >
            YES
          </button>
          <button
            disabled={!ready || tx.spin}
            className="flex-1 rounded bg-rose-800 py-1 text-sm disabled:opacity-40"
            onClick={() => act("bet", [row.id, false], parseEther(stake || "0"))}
          >
            NO
          </button>
        </div>
      )}
      {row.state === 3 && !settled && claimable > 0n && (
        <button className="mt-3 w-full rounded border border-[var(--gold)] py-1 text-sm" disabled={!ready || tx.spin} onClick={() => act("claimWinnings", [row.id])}>
          Collect {rit(claimable)}
        </button>
      )}
      {row.state === 4 && !settled && claimable > 0n && (
        <button className="mt-3 w-full rounded border border-white/30 py-1 text-sm" disabled={!ready || tx.spin} onClick={() => act("claimRefund", [row.id])}>
          Scratch {rit(claimable)}
        </button>
      )}
    </article>
  );
}
