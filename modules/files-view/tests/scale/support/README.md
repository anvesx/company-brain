# support

- `world.ts`: starts a throwaway Postgres 16 (port `SCALE_PG_PORT` or a free one), seeds, runs the module's `migrate`, runs ANALYZE. `stop()` removes the data dir.
- `seed.ts`: 150k files across two tenants, 3,000 clusters (one giant leaf of about 50k files), viewers erin, carol, alice, bob and v1..v200.
- `hot.ts`: the hot query list, built with the module's own SQL builders.
- `report.ts`: timing, percentiles and table output.
- `world.ts` also exports `Ctx` (shared world plus real HTTP server) and `LONG`, the explicit per-test timeout.
