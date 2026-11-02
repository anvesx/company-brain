# @anvesx/scale-k6

Scale test for the read path (board ticket #45, second slice), driven by Grafana k6. k6 is AGPL-3.0, so it stays a separate binary on the developer's machine: nothing here imports it, ships it or links it. Without `k6` on the PATH the runner stops with an error.

Two scripts, each an open-loop `constant-arrival-rate` scenario (requests arrive on schedule even if earlier ones are slow, so a backlog shows up as latency or as `dropped_iterations`, not as a quietly lower rate):

- `scripts/rank.js`: `GET /search` against `features/rank` holding 10,000 docs. `@anvesx/rank` is a library, so `src/rank-server.mjs` puts a thin HTTP handler on `RankIndex.search`. The corpus and the query stream are the ones from `features/rank/scripts/bench` (seeded, Zipf words, 20 groups plus `company`), not a second generator. The index is a real SQLite file.
- `scripts/catalog.js`: `GET /v1/catalog` on the real launcher `apps/connections/dist/bin.js`, over fresh SQLite files, with a signed bearer for `root` in tenant `t1`. Nothing in the app is replaced.

## Run

```sh
pnpm install --frozen-lockfile
pnpm turbo run build --filter=@anvesx/connections-app --filter=@anvesx/rank
pnpm --filter @anvesx/scale-k6 scale            # both
node tools/scale-k6/bin/run.mjs --only rank     # or --only catalog; --docs N changes the corpus
RATE=20 DURATION=60s k6 run ...                 # scripts read RATE and DURATION from the environment
```

Exit code 0 means every threshold held, 99 means a threshold was crossed.

## Thresholds as code

`scripts/thresholds.js`, for both scripts: `p(95)` latency (rank 100 ms, catalog 10 ms), `http_req_failed` under 1 percent, `checks` over 99 percent (status 200 and the body has the right shape), and `dropped_iterations` equal to 0.

## Load applied, and measured

The profile is deliberately modest: the machine was also running other work (load average 4.8 on 8 cores before the run).

| Script  | Arrival rate | Duration | Requests |
| ------- | ------------ | -------- | -------- |
| rank    | 10/s         | 30 s     | 301      |
| catalog | 300/s        | 30 s     | 9,001    |

Hardware: Apple M1, 8 logical cores, 16 GiB, macOS (Darwin 27.0.0, arm64), Node v26.0.0, k6 v2.3.0. k6, the server under test and everything else shared that one machine over loopback, so the numbers carry no network time.

## Results of the reference runs

Ten consecutive runs of `pnpm --filter @anvesx/scale-k6 scale` on 2026-11-02, all exit 0. The 1-minute load average before each run ranged from 2.79 to 5.96.

| Script  | p95 (min to max)     | Requests per run | Failed | Checks failed | Dropped |
| ------- | -------------------- | ---------------- | ------ | ------------- | ------- |
| rank    | 67.07 ms to 78.87 ms | 300 to 301       | 0      | 0             | 0       |
| catalog | 0.315 ms to 0.378 ms | 9000 to 9001     | 0      | 0             | 0       |

An earlier verifier run, with the catalog scenario capped at 40 virtual users, dropped 1 and 29 iterations in two of three runs even though latency was fine: k6 stalled on a busy machine and had no spare users to catch up. The catalog scenario now pre-allocates 100 users and may grow to 400; the `dropped_iterations` limit is unchanged. The rank limit (100 ms) is about 1.3 times the worst measured p95; the catalog limit (10 ms) is about 26 times, because that endpoint is an in-memory list and a tighter limit would only measure scheduler noise on a busy laptop. The rank spread (median about 15 ms, p95 about 70 ms) comes from the query mix: queries on common words match many postings.

Rank saturates near 37 queries per second (see `features/rank/scripts/bench`). At `RATE=80 DURATION=10s` the rank thresholds fail as intended: `dropped_iterations` 287 and p95 1.36 s.

## Layout

- `bin/run.mjs`: starts the servers, runs k6, stops them.
- `src/`: rank HTTP wrapper, server launchers, bearer minting, host description. See [src](src/README.md).
- `scripts/`: the k6 scripts and thresholds. See [scripts](scripts/README.md).
- `tests/`: `node --test` checks of the wrapper and the bearer.

## Not covered

- Writes: indexing under load, `POST /v1/accounts`, `POST /v1/catalog`, sync.
- Corpora above 10,000 docs, and any soak, spike or stress profile; rates above the ones listed.
- The brain app's own query path (`apps/brain`, graph or router); only `features/rank` is measured, not the router that fans out to it.
- A real network, TLS, a remote or Linux host, concurrent users with different tokens and tenants, and a populated custom-connector catalog (the catalog holds only the built-in providers).
- Rank is measured over a single-threaded wrapper: the library is synchronous, so a deployed server may differ.
- No CI job: the connections app is excluded from CI while it links `@anvesx/connectors` from a sibling checkout, and k6 is not installed there.
