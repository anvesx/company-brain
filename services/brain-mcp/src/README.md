# src

- `index.ts`: exports `mountBrainMcp`.
- `server/`: `mount.ts` (route, body limit, session routing), `sessions.ts` (owner-bound LRU), `errors.ts` (`ToolFailure`, `toToolResult`).
- `tools/`: schemas, tool registration, our own `tools/call` dispatch, and the four handlers in `read/`.
- `resources/`: `brain://node/{id}`.
- `access/`: `visible.ts` (async point check of what a user may see), `par.ts` (bounded parallel map) and `bearer.ts` (strips the session cookie so only a bearer token authenticates).

Contract and tests: `tests/`. Brief: `docs/briefs/brain-mcp.md`.
