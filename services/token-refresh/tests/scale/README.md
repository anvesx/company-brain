# tests/scale

One timed run: 10 000 due connector rows, sealed and written through better-auth's adapter, then
one sweep against the replay provider. Only the sweep is measured. It must refresh every row exactly once and
use at most 7 000 ms of cpu (`process.cpuUsage`), on any machine. It must also finish in under 10 000 ms of wall
time, but only when the 1-minute load average is below the core count; otherwise it prints
`SKIPPED: load N, budget not judged` and passes without judging wall time. The test prints
`refreshed/total`, the time taken and the cpu time.

Run it on its own, never in parallel with other files:
`pnpm --filter @anvesx/token-refresh scale`.
