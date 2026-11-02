# reach

- `cost.test.ts`: read-count assertions (batched reads per level, not one per node).
- `limit.test.ts`: limit enforcement, including 0, negative, non-integer and huge values.
- `ghosts.test.ts`: edges to never-created nodes must not shorten results; differential test against the one-lookup-per-node semantics.
