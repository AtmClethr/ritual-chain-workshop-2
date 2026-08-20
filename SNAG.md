# What actually bit me

Two different revert reasons look the same in a wallet: `ZeroStake` and `TinyBet`.

I put `FLOOR_BET = 0.002 ether`. First test sent `0.001 ether` and I kept debugging `ZeroStake` because that's what the workshop slides talk about. The tx was reverting `TinyBet`. Same for the top: `51 ether` is `FatBet`, not "betting closed".

Took me a minute to print the custom error selector instead of guessing from the UI.

Also: in `FakeWire` I named a public string `msg`. Solc hates that (`msg` is reserved). It's `msg_` now.
