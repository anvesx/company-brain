# tests/postgres/titles

Postgres-only title behaviour (spec `docs/specs/feature/graph-store.md`, Behaviour 10):

- `plan.test.ts`: over 60k seeded rows, EXPLAIN of the scan candidates and the search shows an index scan on
  `nodes_title_trgm` or `nodes_tenant_seq` and no Seq Scan, for a selective needle.
- `setup.test.ts`: a role without CREATE on its database cannot create `pg_trgm`, so opening the store rejects
  with GraphError `SETUP` naming the extension.

Each test runs against a real server from `../../support/pg/server.ts`.
