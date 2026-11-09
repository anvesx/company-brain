# src

Source for `@anvesx/graph-store`. Public entry is `index.ts`.

- `schema.ts`: public types, kind lists, `GraphError` and the input checkers (`text` also rejects NUL and lone surrogates).
- `async.ts`: `AsyncGraphStore` and `toAsync`, which wraps the sync store so every call returns a promise.
- `sqlite/`: `open.ts`, the SQLite DDL and `openDb` (WAL, busy timeout, retry of the concurrent WAL switch, `:memory:` guard).
- `postgres/`: the Postgres dialect, see its README.
- `nodes.ts`: the write-transaction helper, node upsert with supersession, close, as-of read, history, and the metadata-only props check.
- `edges/`: edge writes, `neighbors`, the batch reads `nodesOf` / `edgesOf` and the breadth-first traversal.
- `validation/`: field and props validators.
- `index.ts`: `createGraphStore`, the CLOSED guard and the re-exports.

## Reuse

- `pg` 8.23.1 (MIT) is the only new dependency: the Postgres driver that better-auth and kysely already use, so one `Pool` serves the graph and identity. No ORM or query builder; the SQL is hand-written and mirrors SQLite.
