# Source layout

- `adapter.ts` turns the synchronous query service into the async search function the MCP tool expects, embedding the query first.
- `audit.ts` `auditedSearch`: writes one keyed audit row before returning results, fails closed.
- `errors.ts` `RetrievalError` with codes `AUDIT` and `CONFIG`.
- `retrieval.ts` builds the query service, wraps it in the audit, starts the MCP server and returns `{ close, port }`.
- `index.ts` exposes the supported package API.

All runtime imports use ESM `.js` suffixes.
