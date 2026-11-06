# unit

- `nodes.test.ts`: round trip, tenant isolation, no-op upsert.
- `history.test.ts`: supersession, as-of reads, history order, tombstone.
- `edges.test.ts`: idempotent add, kind and direction filters, remove, tombstone cascade.
- `reach.test.ts`: breadth-first order, limit, kinds, cycles, missing nodes, depth cap.
- `reach/`: read-count and limit-enforcement tests for reach.
- `validation/`: props, input and lifecycle checks.
- `limits/`: field and props size limits, tombstone ordering, the `withEnv` helper.
- `batch/`: `nodesOf` and `edgesOf`, the batch reads graph-view needs (frozen contract, human merge).
