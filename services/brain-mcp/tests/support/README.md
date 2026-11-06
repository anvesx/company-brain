# support

- `server.ts`: `bootBrain(limits?)`: identity plus brain-mcp behind one real HTTP server, temp SQLite
  files for both. Mirrors `features/identity/tests/support/server.ts`.
- `users.ts`: `member` (own organisation), `colleague` (invited into another's), `linkAccount` (a real
  provider row in the identity database, tokens included).
- `client.ts`: the SDK client with a bearer, `call`, `data`, raw request helpers, `tokenShapes`.
- `graph.ts`: `tempStore`, `node`, `edge`, `seedOrg` (the two-person fixture every test shares).
- `cli/`: helpers for the agent-CLI e2e tests.

Support code is part of the contract: builders do not edit it.
