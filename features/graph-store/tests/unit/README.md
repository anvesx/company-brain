# unit

- `nodes.test.ts`: round trip, tenant isolation, no-op upsert.
- `history.test.ts`: supersession, as-of reads, history order, tombstone.
- `edges.test.ts`: idempotent add, kind and direction filters, remove, tombstone cascade.
- `reach.test.ts`: breadth-first order, limit, kinds, cycles, missing nodes, depth cap.
- `validation/`: props, input and lifecycle checks.
