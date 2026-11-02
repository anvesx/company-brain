# @anvesx/scale-k6

Scale test for the connections read path (board ticket #45), driven by Grafana k6. k6 is AGPL-3.0, so it stays a separate binary on the developer's machine: nothing here imports it, ships it or links it. Without `k6` on the PATH the runner stops with an error.

The rank half of this test (`GET /search` over 10,000 documents, its HTTP wrapper and its reference numbers) moved to the rag repo with `features/rank` (ADR 0006). What stays is one open-loop `constant-arrival-rate` scenario (requests arrive on schedule even if earlier ones are slow, so a backlog shows up as latency or as `dropped_iterations`, not as a quietly lower rate):

- `scripts/catalog.js`: `GET /v1/catalog` on the real launcher `apps/connections/dist/bin.js`, over fresh SQLite files, with a signed bearer for `root` in tenant `t1`. Nothing in the app is replaced.

## Run

```sh
pnpm install --frozen-lockfile
pnpm turbo run build --filter=@anvesx/connections-app
pnpm --filter @anvesx/scale-k6 scale
RATE=20 DURATION=60s k6 run ...                 # the script reads RATE and DURATION from the environment
```

Exit code 0 means every threshold held, 99 means a threshold was crossed, 1 means k6 did not start or was killed by a signal.

## Thresholds as code

`scripts/thresholds.js`: `p(95)` latency (catalog 10 ms), `http_req_failed` under 1 percent, `checks` over 99 percent (status 200 and the body has the right shape), and `dropped_iterations` equal to 0.

## Load applied, and measured

Arrival rate 300/s for 30 s, 9,001 requests. Hardware: Apple M1, 8 logical cores, 16 GiB, macOS (Darwin 27.0.0, arm64), Node v26.0.0, k6 v2.3.0. k6, the server under test and everything else shared that one machine over loopback, so the numbers carry no network time.

Eighteen runs on 2026-11-02, on a machine that was never quiet: catalog p95 about 0.27 ms to 0.67 ms, 9000 to 9001 requests per run, 0 failed, 0 dropped. The 10 ms limit is far above anything measured. The catalog scenario pre-allocates 100 users and may grow to 400, because an earlier run capped at 40 dropped iterations when k6 stalled on a busy machine. These numbers were not re-run after the rank half moved.

## Layout

- `bin/run.mjs`: starts the server, runs k6, stops the server. Summaries land in `reports/catalog.json` (ignored by version control).
- `src/`: server launcher, bearer minting, host description. See [src](src/README.md).
- `scripts/`: the k6 script and thresholds. See [scripts](scripts/README.md).
- `tests/`: `node --test` checks of the bearer and the exit-code helper.

## Not covered

- Writes: `POST /v1/accounts`, `POST /v1/catalog`, sync.
- Any soak, spike or stress profile; rates above the one listed.
- A real network, TLS, a remote or Linux host, concurrent users with different tokens and tenants, and a populated custom-connector catalog (the catalog holds only the built-in providers).
- No CI job: k6 is not installed on CI runners.
