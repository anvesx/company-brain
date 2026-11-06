# tests/serve

Real-server tests for `src/serve/`. They start a throwaway Postgres (the graph-store test helper) and no mocks.

- `boot.ts`: shared helpers (token, env, wait, seed).
- `health.test.ts`: `databaseUp` is true against Postgres, false when the port is dead, false when the server never answers.
- `serve.test.ts`: `serve()` answers `/healthz`, serves the graph, mounts identity sign-up, survives a Postgres crash, and answers 503 while the database is unreachable.

- `start/`: start-up failures and races (see its README).
- `stop/`: stopping early: a SIGTERM while loading, and `close()` during boot (see its README).

A missing Postgres skips with a printed reason; under `CI=true` it fails.
