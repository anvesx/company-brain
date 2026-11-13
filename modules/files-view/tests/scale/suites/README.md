# tests/scale/suites

Suites run by `../world.test.ts` against its one shared 150k-file world. Each file exports a function taking the shared context; none seeds or starts Postgres.

- `db.ts`: 200 runs per hot query, p50/p95/p99, `EXPLAIN (ANALYZE, BUFFERS)`, no Seq Scan, expected index, bounded rows, no OFFSET.
- `http.ts`: real Hono, real JWKS, 200 sequential requests per route and viewer, TTFB p95 <= 300 ms.
- `cold.ts`: distinct viewers, one request each. `gated.ts`: the real scan-then-gate loop.
