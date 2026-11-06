# integration

Real `@modelcontextprotocol/sdk` client over `StreamableHTTPClientTransport` against the booted app,
with access tokens from the real identity OAuth flow.

- `tools.test.ts`: tools/list, each tool once, the resource.
- `access.test.ts`: 401 challenge (rule 1), A cannot see B's document, other tenants invisible (rule 2).
- `leaks.test.ts`: no JWT or 32+ character base64url run in any output (rule 6).
- `sessions.test.ts`: three interleaved clients, owner-bound 404, LRU eviction 404, DELETE, 400, 413.
- `budget/`: store calls stay bounded at large fan-out, on SQLite and Postgres (see its README).
