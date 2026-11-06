# tests/support/pg

Helpers for running the same graph-store contract on SQLite and on a real Postgres.

- `server.ts`: starts a throwaway Postgres (`initdb` + `pg_ctl start`) in a temp dir on a free port,
  password auth, and removes it after. Uses `$PG_BIN` or `PATH`. Skips with a printed reason when the
  binaries are absent, except under `CI=true`, where a missing Postgres fails the run.
- `factories.ts`: the two store factories (`sqlite`, `postgres`) the contract suite loops over with
  `describe.each`. Each Postgres store gets an empty schema of its own on one server per test file.
- `async.ts`: `codeOf` (the GraphError code a promise rejects with) and `until` (poll a condition).

`tools/deploy` reuses `server.ts` for the container test; tools may depend on features, not the reverse.
