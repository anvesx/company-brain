# tests

Tests for `@anvesx/graph-sync`. They use a real `createGraphStore` file and the real folder connector from `@anvesx/connector-kit`, both in temp directories removed after each test. No mocks.

- `docs.ts` listed-document builder, fixed listing connector, gated (slow) connector
- `helpers.ts` temp dirs, document writer, store opener, reader lookup
- `seed.ts` document seeding and SyncError code assertion
- `count.ts` counter of mutating calls wrapped around the real store
- `unit/` ACL to edges, re-sync, tombstones, failures, input checks, and `safety/` (per-source ids, overlapping runs, bad entries)
- `integration/` folder connector into a graph file: reach, neighbors, reopen, shared file, tenants
- `scale/` 5000 documents with 20 readers each under 20 s
