# Tests

Integration tests run the public API against real Postgres 16. They cover:

- Empty and graph-store-shaped schemas
- Forced tenant RLS reads and writes
- Checksum drift detection
- Idempotent re-runs (multiple migrate() calls are safe)
- Concurrent pool execution (4 pools on a fresh schema)
- Down/up rollback and replay
- Partial migration upgrades (001-only to 002, built by running only the real 001 migration)
- Checksum verification inside the migration advisory lock

`integration/support/` owns schema isolation, `Migrator` helpers and graph-store's current
`nodes`/`edges` bootstrap shape.
