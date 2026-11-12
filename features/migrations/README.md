# @anvesx/migrations

Numbered Postgres 16 migrations for Company Brain. `migrate(pool)` uses Kysely's transactional
Migrator and preserves graph-store's existing `nodes` and `edges` tables. Kysely owns its two
internal coordination tables; `schema_version` is the product ledger with version, apply time and
SHA-256 of both migration directions.

Set the tenant on each transaction before application queries:

```sql
SET LOCAL app.current_tenant = 'tenant-a';
```

Tenant tables have forced row-level security. An unset or different tenant returns no rows and
cannot write rows. Run `pnpm --filter @anvesx/migrations test` with `DATABASE_URL` pointing to a
disposable Postgres 16 database. Tests create and drop isolated schemas, never the database.

The migrations support an empty database and a database already initialized by graph-store's
Postgres dialect. They do not create, replace or remove graph-store tables, extensions or indexes.
