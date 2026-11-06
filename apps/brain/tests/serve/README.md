# tests/serve

- `local/`: the local entry's tests: bad settings, the built binary, stale-build guard (see its README).

Real-server tests for `src/serve/`. They start a throwaway Postgres (the graph-store test helper) and no mocks.

- `boot.ts`: shared helpers (token, env, wait).
- `session.ts`: `signUp` (real sign-up, cookie, tenant and user) and `seed`; `tools/deploy/tests/image/run.test.ts` reuses them.
- `health.test.ts`: `databaseUp` is true against Postgres, false when the port is dead, false when the server never answers.
- `serve.test.ts`: `serve()` answers `/healthz`, serves the graph, mounts identity sign-up, survives a Postgres crash, and answers 503 while the database is unreachable.

- `oauth/`: the MCP OAuth bearer on `/v1/documents` over Postgres (see its README).
- `ready/`: what `/healthz` promises: 503 while the routes are still being built, 200 once they exist (see its README).
- `start/`: start-up failures and races (see its README).
- `keepalive/`: the server's `keepAliveTimeout` and `headersTimeout` are above a proxy's idle time (see its README).
- `stop/`: stopping early: a SIGTERM while loading, and `close()` during boot (see its README).

A missing Postgres skips with a printed reason; under `CI=true` it fails.
