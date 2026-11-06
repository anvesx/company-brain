# src

Source for `@anvesx/graph-store`. Public entry is `index.ts`.

- `schema.ts`: public types, kind lists, `GraphError` and the input checkers.
- `nodes.ts`: the write-transaction helper, node upsert with supersession, close, as-of read, history, and the metadata-only props check.
- `edges/`: edge writes, `neighbors` and the breadth-first traversal.
- `validation/`: field and props validators.
- `sqlite/`: the DDL and `openDb` (WAL, busy timeout, retry of the concurrent WAL switch, `:memory:` guard).
- `search.ts`: `searchTitles`, a literal, ASCII-case-insensitive title match paged by id.
- `scan/`: `scanTitles`, a capped rowid-ordered scan with a cursor and a JS accept predicate.
- `index.ts`: `createGraphStore`, the CLOSED guard and the re-exports.
