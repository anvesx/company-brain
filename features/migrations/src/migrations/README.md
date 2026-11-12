# Numbered migrations

Definitions sort by their numeric prefix. Each contains both directions as canonical SQL; changing
either direction changes its SHA-256. The provider writes that digest to `schema_version` inside the
same Kysely transaction as the DDL.

## Upgrading from partial state

Migrations support partial upgrades. If the `schema_version` table exists but only contains
`001_core`, running `migrate(pool)` will apply only `002_discovery`. The `migrateDown` helper in
`tests/integration/support/migrator.ts` enables downgrade-and-replay workflows for testing.
