# Tests

- `unit`: pure functions, no database.
- `integration`: the public queue API against real Postgres 16, including real child processes
  that are killed with SIGKILL and SIGTERM. No mocks, stubs or fakes.

Run Postgres first (see the package README), then `pnpm --filter @anvesx/job-queue test`. Test
files run one at a time because several measure timing.
