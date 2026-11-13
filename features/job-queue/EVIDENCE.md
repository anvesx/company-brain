# WP-13 job queue: evidence

Branch `wp/13-job-queue`. Package `@anvesx/job-queue` in `features/job-queue`. Builder: Claude mid-engineer.
Reviewer: a different vendor, still to write PASS or FAIL below.

## Licence and registry check (read, not assumed)

- `npm view pg-boss@12.38.2`: license MIT, engines node >=22.12.0, repository timgit/pg-boss, latest
  dist-tag 12.38.2, published on npmjs.
- The `LICENSE` file inside the downloaded tarball is the MIT text, Copyright 2016 Tim Jones.
- Result: pg-boss is used. The graphile-worker fallback was not needed. ADR:
  `docs/adr/product/0013-job-queue-on-pg-boss.md` (Status: accepted).

## Environment

Apple M1, 8 cores, 16 GiB, macOS (Darwin), Node v26.0.0, Postgres 16.15 from
`/opt/homebrew/opt/postgresql@16/bin`, `LC_ALL=en_US.UTF-8`, temp data dir `/tmp/jq-pg-55437`, port 55437,
`DATABASE_URL=postgres://postgres@127.0.0.1:55437/postgres`, `NODE_AUTH_TOKEN=x`. The machine is shared with
other builders: load average 1.8 to 2.9 during the runs below. No mocks, stubs or fakes anywhere.

## Full test run (`pnpm test` in `features/job-queue`, exit 0, 182 s)

```
Test Files  13 passed (13)
      Tests  28 passed (28)
   Start at  10:08:08
   Duration  182.25s (tests 100%)

 % Coverage report from v8
---------------|---------|----------|---------|---------|-------------------
File           | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
---------------|---------|----------|---------|---------|-------------------
All files      |   98.71 |    98.43 |   96.77 |     100 |                   
 src/queue     |   98.27 |     98.3 |      96 |     100 |                   
  boss.ts      |   96.77 |      100 |   93.33 |     100 |                   
  work.ts      |     100 |    88.88 |     100 |     100 | 6                 
---------------|---------|----------|---------|---------|-------------------

=============================== Coverage summary ===============================
Statements   : 98.71% ( 77/78 )
Branches     : 98.43% ( 63/64 )
Functions    : 96.77% ( 30/31 )
Lines        : 100% ( 62/62 )
================================================================================
exit=0
```

## Measurements (real Postgres, same machine, loaded)

Printed by the tests with console output enabled
(`vitest run --disable-console-intercept`, exit 0):

```
{"test":"fairness","backlog":100000,"loadMs":1601,"minnowLagMs":84,"whaleServed":8,"whaleStillWaiting":99992}
{"test":"throughput","machine":"Apple M1 x8, 16 GiB, load 2.4","produced":20000,"producedPerSec":1000,"drainMs":103,"lagMs":{"p50":256,"p95":521,"p99":711,"max":945}}
{"test":"burst","produced":42000,"completed":42000,"drainMs":610,"lagMs":{"p50":2725,"p95":4448,"max":5634}}
```

What these are, honestly:

- Throughput: one process produces 1,000 jobs per second for 20 s (20,000 jobs, 50 tenants) and consumes
  them with one worker (concurrency 16, batch 100). Queue lag is the time from enqueue to handler start. The
  handler does no work, so this measures queue overhead, not real handlers.
- The first full run failed this test (p95 lag 28.8 s, one worker, concurrency 8 and batch 25 drained about
  660 jobs per second). Raising concurrency to 16 and batch size to 100 fixed it. Those are the worker
  settings the load test passes; the package defaults (concurrency 4, batch 10) are lower and are not tuned
  for 1,000 jobs per second on one node.
- Burst: 200 jobs per second for 5 s, 2,000 for 20 s, 200 for 5 s (42,000 jobs). No job lost, none run twice.
  Lag during the burst phase is seconds (p95 4.4 s in this run, 5.4 s in an earlier run) because 2,000
  per second is above one worker's rate. No lag threshold is asserted for the burst.
- Fairness: one tenant with 100,000 waiting jobs; another tenant's single job started 84 ms after
  enqueue (limit 30 s). The whale tenant was held to 8 concurrent jobs.

## Gates

```
$ pnpm structure
> company-brain@0.0.0 structure /Users/rachitsrivastava/Developer/cb-rebuild/wp-13-job-queue
> node tools/structure-lint/bin/cli.mjs
checked 24 packages, 1181 files, 329 folders
exit=0
$ pnpm guard:fakes
> company-brain@0.0.0 guard:fakes /Users/rachitsrivastava/Developer/cb-rebuild/wp-13-job-queue
> node tools/fake-guard/bin/cli.mjs
checked 810 files, 4 findings, 1 baselined
exit=0
$ pnpm exec biome check features/job-queue
Checked 41 files, no fixes needed (re-run after removing generated coverage/ output)
exit=0
$ pnpm --filter @anvesx/job-queue typecheck
> @anvesx/job-queue@0.1.0 typecheck /Users/rachitsrivastava/Developer/cb-rebuild/wp-13-job-queue/features/job-queue
> tsc --noEmit
exit=0
$ pnpm deps
> company-brain@0.0.0 deps /Users/rachitsrivastava/Developer/cb-rebuild/wp-13-job-queue
> depcruise features services apps --config .dependency-cruiser.cjs
✔ no dependency violations found (798 modules, 2343 dependencies cruised)
exit=0
```

JQ-04: `rg -l "from .pg-boss" features services apps` lists only `features/job-queue/src/queue/boss.ts`.

## Checklist

`todo/TODO.md`: 67.6% (25/37), 8 of 12 items ticked: JQ-01, 02, 03, 04, 05, 06, 07, Q1.

## What is NOT done

1. JQ-08 and JQ-09 are not proven with k6. No k6 script was written or run. The node tests above are scaled
   stand-ins. The burst is 20 s, not 5 min.
2. JQ-Q2: Stryker was not run, so the mutation score is unknown. A Stryker config would also be a sixth file
   in the package root, which the structure rule does not allow without a decision.
3. JQ-Q3: no different-vendor reviewer has signed off.
4. `tests/contract/*.test.ts` and `tools/scale-k6` do not exist in this tree. Items JQ-02 to JQ-07 and Q1 are
   ticked on package-local tests (in `tests/integration`), not on the proof commands the checklist names.
5. Delivery is at least once, not exactly once. "Runs exactly once" holds in the crash test because the
   killed handler had not recorded completion. A handler that finishes its side effect and dies before the
   ack runs again.
6. Crash detection is not instant: the minimum heartbeat window is 10 s, plus the monitor interval.
7. The idempotency window equals job-row retention (7 days after completion by default).
8. The back-pressure check counts waiting jobs up to the limit and still walks the index past other tenants'
   rows, so it is not O(1) when one huge shared backlog exists. The fairness test enqueues without that guard.
9. The cron test waits for a real minute boundary (up to 150 s); it covers registration and one firing, not
   the 24 h and nightly schedules firing.
10. No multi-node load test across machines. The three-node test runs three in-process queues on one machine.
11. The package is not wired into any service yet; nothing outside this package imports it.

## Reproduce from a fresh clone

```
git clone <repo> && cd <repo> && git checkout wp/13-job-queue
export PATH=/opt/homebrew/opt/postgresql@16/bin:$PATH LC_ALL=en_US.UTF-8 NODE_AUTH_TOKEN=x
initdb -D /tmp/jq-pg-55437 -U postgres --auth=trust
pg_ctl -D /tmp/jq-pg-55437 -o "-p 55437 -c max_connections=300" -l /tmp/jq-pg.log start
export DATABASE_URL=postgres://postgres@127.0.0.1:55437/postgres
pnpm install && pnpm --filter @anvesx/job-queue test && pnpm structure && pnpm guard:fakes && pnpm deps
```
