# src/edges

Everything that reads or writes edges.

- `edges.ts`: edge add, remove, close-all-for-node, `neighbors`, and the prepared out-edge lookup used by traversal.
- `reach.ts`: breadth-first, cycle-safe, depth-capped, limit-capped traversal over those edges, evaluated as of a point in time.

Both import their input checkers and `GraphError` from `../schema.ts`; `index.ts` wires them to the open database.
