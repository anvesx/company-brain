# tests/serve/keepalive

- `keepalive.test.ts`: `tune` sets `keepAliveTimeout` 620 s and leaves `headersTimeout` at Node's 60 s, under `requestTimeout` (Node's `createServer` rejects a `headersTimeout` above `requestTimeout`; the test proves that too). A keep-alive probe against `serve()` on Postgres and against the local brain app gets `Keep-Alive: timeout=620`, not Node's `timeout=5`.
