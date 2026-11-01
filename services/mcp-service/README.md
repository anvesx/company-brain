# @brain/mcp-service

Runs the `search` MCP tool from `@brain/mcp-search-tool` over real MCP transports, using the
`@modelcontextprotocol/sdk` stdio and Streamable HTTP transports (nothing hand-rolled).

```ts
import { startMcpServer } from "@brain/mcp-service";

const server = await startMcpServer({
  transport: "http", // or "stdio"
  port: 0, // http only; 0 = ephemeral, read server.port
  search: ({ query, limit, principal }) => index.search(query, limit, principal),
  principalFor: (extra) => principalFromAuthHeader(extra), // throws when unauthenticated
});
await server.close();
```

## Behaviour

- The principal always comes from `principalFor(extra)`, never from tool input. Over HTTP, `extra.requestInfo.headers`
  carries the request headers.
- HTTP: endpoint `POST/GET/DELETE /mcp` on 127.0.0.1 (or `host`). A request whose `principalFor` throws gets
  `401` before the SDK sees it. A session id used by a different principal gets `403`; unknown id `404`;
  non-initialize request without a session `400`; invalid JSON `400`; body over 1 MiB `413`; other paths `404`.
- stdio: one connection on `stdin`/`stdout` (injectable). `principalFor` has no headers there, so resolve from
  process context (env, config).
- `close()` is idempotent. HTTP close ends every session, closes streams, and frees the port.
- Invalid options throw `McpServiceError` with code `INVALID_CONFIG`.

## Limits

No TLS, CORS, rate limiting, or session expiry; put it behind a gateway. Sessions are in-memory and per process.
No DNS-rebinding (Host header) check; binding to loopback by default is the only guard.

## Verification

`pnpm test` builds the package, spawns a real stdio child, and starts real HTTP servers on ephemeral ports.
`pnpm typecheck`, `pnpm mutation`.
