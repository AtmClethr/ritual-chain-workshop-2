# Booth notes

Think racetrack window, not a dapp.

- You stamp a slip (`createMarket`). That also books the wake-up. No second tx.
- Tickets: `FLOOR_BET` 0.002 RITUAL, `CEIL_BET` 50. Dust and whales both bounce.
- Bell: Scheduler, not me. I don't have a resolve button on purpose.
- Tape: GET then jq `.price`. If the tape is dead, the slip is scratched after three tries. We do not invent a NO.
- Clock is blocks. I don't touch `block.timestamp` (it's milliseconds on this chain anyway).

Helpers I actually used in the booth UI: `clockFor`, `matchesRule`, `escrowUntil`.

The board is supposed to hold more than one slip. Pots do not mix: ringing window A leaves window B selling.
