# hardening

Defects the first verification found, each pinned by a test that was red before the fix.

- `bearer.test.ts`: `/mcp` takes a bearer token only; a browser session cookie is never enough.
- `input.test.ts`: every bad argument, and an unknown tool, ends as `{ code, message }` in `structuredContent`.
- `rpc.test.ts`: raw JSON-RPC: a string `arguments` is -32602; a CORS preflight gets 401.
