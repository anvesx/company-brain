# postgres

The Postgres 16 dialect of the graph store. Same rows and same SQL as SQLite, with `$n` placeholders.

- `store.ts`: `createPostgresGraphStore({ pool })`. Runs the DDL, adds the CLOSED guard. `close()` never ends the pool.
- `schema.ts`: the DDL, `tx` (one transaction on one connection) and `migrate` (DDL under `pg_advisory_xact_lock`, so parallel starts take turns).
- `nodes.ts`: upsert with supersession, as-of read, history and tombstone. Writers on one id take `pg_advisory_xact_lock(hashtext(tenant), hashtext(id))`.
- `edges.ts`: add (`ON CONFLICT ... DO NOTHING`), remove, neighbors and by-source reads.
- `many/`: `many.ts` holds `nodesOf` and `edgesOf`, one `= ANY($n)` query each; nodes are sorted in JS (code-unit order, not the database collation), edges by `seq`.
- `reach/`: `reach.ts`, breadth-first walk with two queries per level (`= ANY($n)`), not one per node.

`seq` (an identity column) replaces SQLite's `rowid` for insertion order. Props stay text holding sorted JSON, so they round-trip byte for byte.
