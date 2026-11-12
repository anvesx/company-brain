# Integration

Each file drives the public `migrate(pool)` contract through a real `pg.Pool` on Postgres 16.

- `lifecycle.test.ts`: empty database, graph-store shape, idempotent re-runs, 4 concurrent pools.
- `rollback.test.ts`: `Migrator.migrateDown()` then re-up, and 001-only to 002 upgrade.
- `checksum.test.ts`: edited-checksum rejection and verification inside the migration lock.
- `rls.test.ts`: wrong-tenant reads and cross-tenant writes under forced RLS.
- `support/`: schema isolation and `Migrator` helpers.
