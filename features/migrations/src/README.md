# Source

`runner.ts` owns Kysely setup and checksum validation. `checksum.ts` hashes immutable migration
definitions. `migrations/` contains the numbered Postgres 16 DDL. `index.ts` is the public surface.
