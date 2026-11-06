# server

The HTTP side of the MCP server.

- `mount.ts` adds `/mcp` to the app: token check, body size limit, then the session.
- `sessions.ts` keeps open sessions per user, capped, oldest-used dropped first.
- `build.ts` makes one MCP server per session.
- `errors.ts` turns a thrown error into a safe tool result with a fixed code.
