# Source layout

- `adapter.ts` turns the synchronous query service into the async search function the MCP tool expects, embedding the query first.
- `retrieval.ts` builds the query service, starts the MCP server and returns `{ close, port }`.
- `index.ts` exposes the supported package API.

All runtime imports use ESM `.js` suffixes.
