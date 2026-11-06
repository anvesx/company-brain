# tests/serve/ready

Readiness of `src/serve/`: what `/healthz` promises. Real server and real Postgres, no mocks.

- `ready.test.ts`: `/healthz` is 503 while the routes are still being built (the pool already answers `select 1`) and 200 only once identity and the graph exist, after which `/v1/*` is served (401 without a token, not 503). The only injection is a delay around the real graph-store constructor through serve's `deps` seam.
