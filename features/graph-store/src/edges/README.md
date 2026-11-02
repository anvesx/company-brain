# src/edges

Everything that reads or writes edges.

- `edges.ts`: edge add, remove, close-all-for-node, `neighbors`, `bySource`.
- `batch.ts`: the two batched reads traversal uses: out-edge targets for a whole frontier, and nodes for a list of ids (IN lists of 500, row-limited).
- `reach.ts`: breadth-first, cycle-safe, depth-capped, limit-capped traversal, as of a point in time. One edge read and one node read per level; at most min(limit * 10, 100000) edges read in total, so edges to missing nodes cannot inflate cost.

Both import their input checkers and `GraphError` from `../schema.ts`; `index.ts` wires them to the open database.
