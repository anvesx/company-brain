# Test support

- `db.ts`: one disposable database per test file on the real Postgres 16 (needs `DATABASE_URL`).
- `wait.ts`: polling, sleep and percentile helpers.
- `load.ts`: fixed-rate producer plus real workers, returning per-job queue lag.
- `worker.ts`: child process that runs a worker; the crash and shutdown tests kill it for real.
