# tests/postgres

Postgres-only behaviour that SQLite cannot show (spec `docs/specs/infra/deploy.md`, Behaviour 1-6):

- `concurrency.test.ts`: two pools on one schema (two "instances") upserting the same node id at once,
  twenty concurrent writers, concurrent `addEdge`, five instances creating the tables at once, and
  `close()` leaving the caller's pool alone.
- `pool.test.ts`: opening a store 15 times on one pool adds no `error` listener.
- `restart.test.ts`: a backend killed while blocked before and while blocked on its INSERT (no partial row), a server crash and restart under a live pool,
  and opening a store against an unreachable database.

Each test runs against a real server from `../support/pg/server.ts`. No mocks.
