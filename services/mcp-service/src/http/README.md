# src/http

Streamable HTTP transport built on the SDK's `StreamableHTTPServerTransport`; this folder only does
routing, authentication, session ownership and body limits.

- `server.ts`: node `http` server, route `/mcp`, status mapping, graceful close.
- `sessions.ts`: one `McpServer` + transport per session, pinned to the principal that opened it.
- `body.ts`: JSON body reader capped at 1 MiB.
