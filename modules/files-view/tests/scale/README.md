# tests/scale

Scale proof for the Files and Clusters view on real Postgres 16: 150k files, 3k clusters, about 340k edges.

- `world.test.ts`: the only seeding. One `beforeAll` (300 s) builds the world, then runs every suite in `suites/` on it. Setup failure throws; nothing skips.
- `suites/`: db, http, cold-viewer and gated-scan tests. `support/`: seed, world, hot query list, report helpers. `http/`: real server helper, route list, optional k6.

All SQL comes from the module's own builders and its real `migrate`; there are no private copies.
Run: `SCALE_PG_PORT=<port> pnpm exec vitest run tests/scale --reporter=verbose`. The port defaults to a free one; the data dir is a mktemp dir removed in teardown.
