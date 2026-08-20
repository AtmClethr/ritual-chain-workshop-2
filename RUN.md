# Run

```bash
cd hardhat
pnpm install
pnpm exec hardhat test
# 28 solidity (WindowSuite) + 2 window.e2e walks
```

Walks:

- YES 3 vs NO 1, tape 4300 vs 4000 → paid YES, winner takes 4
- wire killed 3 times → SCRATCH, 2 returned

```bash
cd web
pnpm install
pnpm dev
# GET /api/oracle/eth
```
