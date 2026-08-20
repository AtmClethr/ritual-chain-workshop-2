# Snag

The callback must not revert on a garbled HTTP envelope. A revert would
rewind `attempts` and the slip could never scratch. `_hitWire` uses
`try this.decodeHttpResponse`. Only a non-Scheduler caller reverts.

Compile: HTTP fake fallback cannot be `payable` when tests cast `0x0801`.
jq fake fallback cannot be `view`. Both are plain `fallback()`.
