# Spec: mcp-server

Tier: feature (`features/brain-mcp`), mounted by the brain app at `/mcp`. ADR 0004 (graph only),
ADR 0008 (OAuth by better-auth, resource = `<base>/mcp`). Depends on `@anvesx/graph-store`,
`@anvesx/identity` (port) and `features/graph-view` (visibility rule).

Exact source: the Model Context Protocol specification 2025-06-18 (Streamable HTTP transport,
OAuth 2.1 authorization, tools, resources). The install guide's client list follows each vendor's
MCP docs.

## Purpose
Every AI agent the owner uses (Claude Code, Claude Desktop, Codex, Kiro, Antigravity, Cursor,
Gemini CLI) connects to the brain over MCP with the user's own sign-in, and sees exactly what
that user may see: the access-filtered graph and the linked connectors. One server, one URL,
OAuth discovery the clients already implement.

## Reuse decision
`@modelcontextprotocol/sdk` 1.32.2 (`McpServer`, `StreamableHTTPServerTransport`) through
`@hono/mcp` 0.3.5, which adapts the transport to the Hono app the identity routes already live
in. Auth is the existing identity port (`fromBearer`): the better-auth mcp plugin already serves
discovery and tokens. We write: the tool handlers (thin calls into graph-view and graph-store),
the resource templates, the session store and the install templates for kiro and antigravity.

## Public interface
```ts
mountBrainMcp(app: Hono, deps: { store: GraphStore; port: IdentityPort; clock: () => number; limits?: { sessions: number; body: number } }): void
// tools (names fixed; schemas in src/tools/schema.ts)
//  brain.search   { query: string; kinds?: NodeKind[]; limit?: number }   -> { nodes: GraphViewNode[] }
//  brain.node     { id: string; asOf?: number }                           -> { node, neighbours: Edge[] }
//  brain.graph    { cursor?: string; limit?: number }                     -> GraphViewPage
//  brain.connectors {}                                                     -> { providers: { id, status, linkedAt? }[] }
// resources: brain://node/{id}  (text: title, kind, source, neighbours as a list)
```

## Behaviour
1. `POST /mcp` without a valid bearer answers 401 with the `WWW-Authenticate` challenge of identity rule 8, never 403. Every tool runs as the `Caller` from the token; `tenant` and `user` come from the token, never from arguments.
2. Every node a tool returns passes `visibleGraph`'s rule 1 for that caller. A node outside the visible set is "not found", indistinguishable from a node that does not exist.
3. `brain.search` matches `title` case-insensitively (SQLite `LIKE` with escaped `%` and `_`), capped at `limit` (default 20, max 100). Empty query: `INVALID_ARGUMENT`. Unicode titles match by code point.
4. `brain.node` returns the node and its visible edges; `asOf` uses the bitemporal read.
5. `brain.graph` pages exactly as graph-view rule 3.
6. `brain.connectors` lists the caller's linked accounts by provider id with status, no tokens, ever. The tool output and the resource text are checked against a token-shaped regex in the test.
7. Sessions: `Mcp-Session-Id` per client, in memory, capped at `limits.sessions` (default 10,000) with least-recently-used eviction; an evicted session answers 404 so the client re-initializes. Bodies above `limits.body` (default 1 MiB) are 413.
8. A tool error is an MCP `isError` result with a typed code (`NOT_FOUND`, `INVALID_ARGUMENT`, `UNAUTHENTICATED`), never a thrown 500. The transport's own errors (bad JSON-RPC) are the SDK's.
9. Stdio is not served. Local clients use the HTTP URL; the install guide says so.
10. The install guide adds `kiro` (`.kiro/settings/mcp.json`, `mcpServers.<name>.url`) and `antigravity` (its MCP config file) templates. Both start with every field in `unconfirmed` until a maintainer checks the vendor docs, as identity rule 10 requires. Claude Code's `claude mcp add --transport http` line stays first.
11. Concurrency: two clients of one user and one client of another user, interleaved, each see only their own session and their own visible set (an integration test runs the three in parallel).
12. Budget: `brain.search` p99 under 50 ms at 100k nodes per tenant on the integration machine; `tools/list` under 5 ms.

## Acceptance tests (written first)
- unit: schema validation per tool (empty, huge, wrong type), LIKE escaping, session cap and eviction, error mapping.
- integration: real `@modelcontextprotocol/sdk` `Client` over `StreamableHTTPClientTransport` against the booted app: discovery, token from the identity test support, `tools/list` names, each tool once; 401 challenge without a token; user A cannot see user B's document through any tool; no token-shaped string in any tool output; three interleaved clients; 100k node search timing.
- e2e: Claude Code CLI (`claude mcp add` with the rendered command, then `claude mcp list`) against the local server, output captured as the artifact; Codex and Kiro configs parsed back by their own CLIs where installed (`codex mcp list`, `kiro-cli mcp list`).
- mutation: Stryker >= 80 on tools and sessions.

## Layout
`features/brain-mcp/{src/{tools/{search.ts,node.ts,graph.ts,connectors.ts,schema.ts},server/{mount.ts,sessions.ts,errors.ts},resources/node.ts,index.ts},tests/{unit,integration,e2e},README.md}`;
`features/identity/src/install/templates.ts` gains two entries (split the file if it passes 80 lines).

## Out of scope
Write tools (the brain is read-only over MCP in this slice), prompts, sampling, stdio transport.
