# budget

Store work stays bounded however wide the graph is. Each test runs on SQLite (`toAsync`) and on Postgres
(`storeFactories` in `../../support/server.ts`); the Postgres one skips only when no server binaries are found.

- `count.ts`: `counted` wraps a store and records every call by name; `seed` writes many rows 50 at a time.
- `visible.test.ts`: a viewer who can read nothing checks a person and a project that each hang on 4,000
  documents in at most `ceil(4000 / CHUNK) + 6` store calls, bulk or not (it took 16,005 before batching).
- `search.test.ts`: search spends one 4,096-candidate budget per call, not 4 rounds. 300 hidden people ahead
  of 5 readable documents give all 5 in at most 2 pages (it took 15 before); a caller who reads nothing over
  10,000 titles gets `truncated` in at most 12 store calls (85 before) and reaches the end in 3 pages.
