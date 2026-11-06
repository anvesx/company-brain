# budget

Store work stays bounded however wide the graph is. Each test runs on SQLite (`toAsync`) and on Postgres
(`storeFactories` in `../../support/server.ts`); the Postgres one skips only when no server binaries are found.

- `count.ts`: `counted` wraps a store and records every call by name; `seed` writes many rows 50 at a time.
- `visible.test.ts`: a viewer who can read nothing checks a person and a project that each hang on 4,000
  documents in at most `ceil(4000 / CHUNK) + 6` store calls, bulk or not (it took 16,005 before batching).
