# bin

`cli.mjs` is the `structure-lint` executable (`pnpm structure` at the repo root). It parses `--root`,
finds every package under the tier folders, runs the folder rules plus the tier-direction check,
sorts the violations, and prints one `file:rule:message` line each.

The last line is the denominator: `checked N packages, F files, D folders`. `F` counts every file
and `D` every folder under each package's `src`, `tests`, `bin` and `scripts`. Exit codes: `0` clean,
`1` violations or invalid package metadata, `2` no packages found (an empty gate is never green).
