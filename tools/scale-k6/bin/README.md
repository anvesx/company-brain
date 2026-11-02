# bin

- `run.mjs [--docs 10000] [--only rank|catalog]`: prints the host, starts the servers, runs each k6 script with `--summary-export` into `reports/` (ignored by version control, kept after the run), stops the servers, exits non-zero when any k6 run fails (99 when a threshold fails; a k6 killed by a signal or not started counts as 1).
- `outcome.mjs`: `exitCode(spawnResult)` and `reportPath(script)`, the two pure helpers `run.mjs` uses.
