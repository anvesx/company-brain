# Tests

`integration/` runs the real app against real Postgres 16 and a real OIDC server; `unit/` is pure; `support/` holds the
harness (database, OIDC server, app, browser). Run with `DATABASE_URL` pointing at a disposable Postgres 16 (`support/pg-temp.sh`).
