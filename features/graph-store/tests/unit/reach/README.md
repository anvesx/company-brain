# reach

- `cost.test.ts`: read-count assertions (one batched query per level, not one per node).
- `limit.test.ts`: limit enforcement, including 0, negative, non-integer and huge values.
- `reads.ts`: statement-read counter and star-graph builder shared by both.
