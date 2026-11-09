# unit

- `schema.test.ts`: the four tools' zod inputs: empty, oversize, wrong type, bounds, defaults.
- `errors.test.ts`: GraphError, IdentityError, ToolFailure and unknown throws to isError results;
  INTERNAL never echoes the cause.
- `sessions.test.ts`: cap 10,000 by default, LRU eviction closes the transport, owner-bound reads,
  delete. Uses real `@hono/mcp` transports.
- `visible.test.ts`: visibility rule 1 against a real store file, including tenant scope and asOf.
