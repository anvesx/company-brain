# src

Source for `@brain/graph-store`. Public entry is `index.ts`.

- `schema.ts`: public types, kind lists, `GraphError` and the input checkers.
- `nodes.ts`: the write-transaction helper, node upsert with supersession, close, as-of read, history, and the metadata-only props check.
- `edges.ts`: edge add, remove, close-all-for-node, `neighbors`, and the prepared out-edge lookup used by traversal.
- `reach.ts`: breadth-first, cycle-safe, depth-capped, limit-capped traversal.
- `index.ts`: the DDL, `openDb` (WAL, busy timeout, retry of the concurrent WAL switch, `:memory:` guard), `createGraphStore`, the CLOSED guard and the re-exports.
