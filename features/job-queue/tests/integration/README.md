# Integration tests

Every test here talks to a real Postgres 16 through `DATABASE_URL`; each test file creates and
drops its own database. Folders: `delivery` (keys, retries, dead letters, cron), `resilience`
(crash, shutdown, contention, fairness), `load` (throughput, burst), `support` (helpers). `options.test.ts` covers default options and repeated signals.
