# Source

- `layout.ts`: each package has `README.md`, `src/` and `tests/`, and at most five files in its root.
- `tiers.ts`: workspace dependencies only point down the tier ladder.
- `checks/`: the per-folder rules (lines, fanout, README, tests beside src).
- `fs/`: package discovery and the code-folder walker.

Rule modules return structured violations without printing or mutating the repository.
`bin/cli.mjs` owns argument parsing, output and process exit codes.
