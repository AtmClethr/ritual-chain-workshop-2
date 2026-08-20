# I ran this

From `hardhat/`:

```
pnpm exec hardhat test
```

Last print: **30 passing** (28 in `WindowSuite`, 2 in `window.e2e.ts`).

Walk A: Ann 3 YES, Ben 1 NO, tape 4300, target 4000 → Ann walks with 4.
Walk B: kill the tape three times → scratch, Ann gets 2 back.

Web:

```
cd web && pnpm dev
```

Tape is `/api/oracle/eth`. If you point the slip at localhost, the contract will `BadFeed` you. Tunnel it.

If a wallet overlay yells "source has not been authorized", that's the extension, not the tape. Approve `http://localhost:3000` in the wallet, or use one that already trusts the origin. The booth is chain 1979.
