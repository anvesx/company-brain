# Evidence

Run against a disposable Postgres 16 at `postgres://postgres@127.0.0.1:55432/cb_test`.

## Tests

`cd features/migrations && DATABASE_URL=... pnpm exec vitest run --config ../../vitest.config.ts`
(exit 0): 4 files, 10/10 tests passed.

- Empty database, graph-store shape, three idempotent runs, 4 concurrent pools.
- `migrateDown()` then re-up; 001-only (real `migrateTo("001_core")`) upgraded to 002.
- Edited checksum rejected; a checksum edit committed while another caller holds the migration lock
  is seen after the lock is taken (`CHECKSUM_MISMATCH`).
- Wrong-tenant reads return zero rows; cross-tenant writes fail under RLS `WITH CHECK`.

Against the previous `runner.ts` (checksums verified before the lock) the lock test and the 4-pool
concurrency test both fail, so they detect the race.

Each test gets its own database. With a shared database, parallel test files raced Kysely's
`has_schema_privilege` catalog scan against another file's `DROP SCHEMA` (about 1 run in 2 failed with
`schema ... does not exist`). After the change, 10 consecutive runs passed 10/10.

Without `DATABASE_URL` (and without `CI`) the suites skip, as graph-store's do. The commit hook runs
tests through turbo, which drops `DATABASE_URL`, so the hook run skips them. In CI a missing
`DATABASE_URL` is not skipped.

## Gates

Results of `pnpm structure`, `pnpm guard:fakes` and `pnpm exec biome check` are in the commit report.
