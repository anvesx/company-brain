# src/edges

Everything that reads or writes edges.

- `edges.ts`: edge add, remove, close-all-for-node, `neighbors`, `bySource`.
- `batch.ts`: the two batched reads traversal uses. `pages` streams out-edge targets of a whole frontier in frontier-then-insertion order, one query per page (1000 rows, then x4 up to 50,000; keyset on frontier rank and rowid). `nodes` looks up many ids per IN list.
- `reach.ts`: breadth-first, cycle-safe, depth-capped, limit-capped traversal, as of a point in time. Returns exactly min(limit, reachable) nodes, same order as a one-lookup-per-node walk. Ghost edges (target node missing) are read but never counted. Reading stops once `limit` nodes are found; there is no edge cap, so cost follows the edges scanned until then.
