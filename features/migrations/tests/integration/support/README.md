# Support

Helpers for the integration tests. `database.ts` owns database, schema and role isolation on real Postgres 16.
`migrator.ts` drives Kysely's `Migrator` directly (`migrateDown`, `migrateOnlyTo`) against the real
definitions. `shapes.ts` holds graph-store's current `nodes`/`edges` shape and small query helpers.
