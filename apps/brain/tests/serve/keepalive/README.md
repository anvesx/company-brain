# tests/serve/keepalive

- `keepalive.test.ts`: `tune` sets `keepAliveTimeout` 620 s and `headersTimeout` 625 s. A keep-alive probe against `serve()` on Postgres and against the local brain app gets `Keep-Alive: timeout=620`, not Node's `timeout=5`.
