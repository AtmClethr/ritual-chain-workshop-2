# I ran this

From `hardhat/`:

```
pnpm exec hardhat test
```

Last print: **33 passing** (30 in `WindowSuite`, 3 in `window.e2e.ts`).

Walk A: Ann 3 YES, Ben 1 NO, tape 4300, target 4000 → Ann walks with 4.
Walk B: kill the tape three times → scratch, Ann gets 2 back.
Walk C: two windows on the board. Ring the first; the late race still sells its own pot.

Web:

```
cd web && pnpm dev
```

Tape is `/api/oracle/eth`. If you point the slip at localhost, the contract will `BadFeed` you. Tunnel it.

If a wallet overlay yells "source has not been authorized", that's the extension, not the tape. Approve `http://localhost:3000` in the wallet, or use one that already trusts the origin. The booth is chain 1979.

Live tape (TEE can fetch this; loopback is `BadFeed`): `tape.json` on this repo.
Stamp three slips after a 1979 deploy:

```
PREDICT_ADDRESS=0x... ORACLE_URL=https://raw.githubusercontent.com/AtmClethr/ritual-chain-workshop-2/main/tape.json
pnpm exec hardhat run scripts/stamp-board.ts
```

If the public RPC is dark, open a local till (`chainId` 1979) and stamp the same three slips:

```
pnpm exec hardhat node --chain-id 1979
pnpm exec hardhat run scripts/open-till.ts
```

Point `web/.env.local` at `WINDOW=` from that print and `NEXT_PUBLIC_RITUAL_RPC_URL=http://127.0.0.1:8545`.
