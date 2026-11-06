# unit/batch

Frozen contract for the additive batch reads graph-view needs to load a whole visible graph in under
300 ms. Interface change: human merge (A15).

| File            | What it pins                                                                                  |
| --------------- | --------------------------------------------------------------------------------------------- |
| `nodes.test.ts` | `nodesOf`: as `node()` per id, sorted, `asOf`, tenant, 12,000 ids, BAD_INPUT, CLOSED.         |
| `edges.test.ts` | `edgesOf`: as `neighbors()` per id, dir, kinds, `asOf`, tenant, 1,000 ids, BAD_INPUT, CLOSED. |
