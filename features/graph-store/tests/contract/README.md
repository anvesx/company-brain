# tests/contract

The graph-store contract, run unchanged on every dialect. Each file loops over the factories in
`../support/pg/factories.ts` (`sqlite`, `postgres`) and opens a fresh, empty store per test through the
promise-returning `AsyncGraphStore`.

- `nodes.test.ts`: round-trip, tenant isolation, supersession and asOf, no-op upsert, persistence.
- `edges.test.ts`: idempotent add, remove keeps history, neighbors filters, edgesBySource, tombstone.
- `reach.test.ts`: breadth-first order, cycles, depth and limit caps, ghosts, asOf, a 3000-edge fan-out.
- `limits.test.ts`: props at and over every cap, unicode titles and ids, NUL and lone surrogates, close.
- `many/`: `many.test.ts` covers `nodesOf` and `edgesOf`: sorted ids, asOf, tenant, kinds, insertion order, BAD_INPUT, CLOSED.
- `spend/`: `scanTitles` reports `examined` and per-row `cursors`, so a caller can spend one budget over calls.
- `titles/`: `search.test.ts` and `scan.test.ts` cover `searchTitles` and `scanTitles` (what the MCP server reads) on both dialects.

Owned by the lead (spec `docs/specs/infra/deploy.md`). Builders make these pass; they do not edit them.
The older sync tests in `../unit` and `../integration` stay as the SQLite-specific suite.
