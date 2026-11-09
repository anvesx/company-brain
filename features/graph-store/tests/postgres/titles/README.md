# tests/postgres/titles

Postgres-only title behaviour (spec `docs/specs/feature/graph-store.md`, Behaviour 10):

- `plan.test.ts`: over 60k seeded rows, EXPLAIN of the scan candidates and the search shows an index scan on
  `nodes_title_trgm` or `nodes_tenant_seq` and no Seq Scan, for a selective needle.
- `cursor.test.ts`: pins the known limit that a row committed late, with a `seq` below a reader's cursor, is
  skipped by that reader's next page and found by a new scan.
- `setup.test.ts`: a role without CREATE on its database cannot create `pg_trgm`, so opening the store rejects
  with GraphError `SETUP` naming the extension.

Each test runs against a real server from `../../support/pg/server.ts`.
