# Spec: mcp-server

Tier: service (`services/brain-mcp`, package `@anvesx/brain-mcp`), mounted by the brain app at
`/mcp`. The file stays under `specs/feature/` so existing links hold. ADR 0004 (graph only), ADR 0008
(OAuth by better-auth, resource = `<base>/mcp`). Depends on `@anvesx/graph-store` and
`@anvesx/identity` (`protect`). Brief: `docs/briefs/brain-mcp.md`.

Exact source: the Model Context Protocol specification 2025-06-18 (Streamable HTTP transport,
OAuth 2.1 authorization, tools, resources). The install guide's client list follows each vendor's
MCP docs; the kiro and antigravity shapes were read back from `kiro-cli 3.0.0` and `agy 1.5.2`.

## Purpose
Every AI agent the owner uses (Claude Code, Claude Desktop, Codex, Kiro, Antigravity, Cursor,
Gemini CLI) connects to the brain over MCP with the user's own sign-in, and sees exactly what
that user may see: the access-filtered graph and the linked connectors. One server, one URL,
OAuth discovery the clients already implement.

## Reuse decision
Extract-and-compose, no new framework. `@modelcontextprotocol/sdk` 1.32.2 (`McpServer`) through
`@hono/mcp` 0.3.5 (`StreamableHTTPTransport`), which adapts the transport to the Hono app the
identity routes already live in; `hono/body-limit` for 413. Auth is identity's `protect`
middleware, which already answers 401 with the rule-8 challenge. Title search is a new graph-store
method, `searchTitles`, because a SQL `LIKE` belongs next to the schema. We write: the tool
handlers, the resource template, the owner-bound session store, the visibility point check and the
kiro and antigravity install templates.

## Public interface
```ts
mountBrainMcp(app: Hono, deps: {
  store: GraphStore; protect: Identity["protect"];
  accounts: (user: string) => Promise<Record<string, unknown>[]>;
  limits?: { sessions: number; body: number };
}): void
// graph-store gains:
// searchTitles(tenant, { text, kinds?, limit, after?, asOf? }): GraphNode[]   (limit 1..1000)
// tools (names fixed; zod schemas in src/tools/schema.ts)
//  brain.search   { query: string; kinds?: NodeKind[]; limit?: number }   -> { nodes }
//  brain.node     { id: string; asOf?: number }                           -> { node, neighbours }
//  brain.graph    { cursor?: string; limit?: number }                     -> { nodes, edges, categories, next? }
//  brain.connectors {}                                                    -> { providers: { id, status, linkedAt? }[] }
// resources: brain://node/{id}  (application/json: the node and its visible neighbours)
```

## Behaviour
1. `POST /mcp` without a valid bearer answers 401 with the `WWW-Authenticate` challenge of identity rule 8, never 403. The token is checked before the body size. Every tool runs as the `Caller` from the token; `tenant` and `user` come from the token, never from arguments.
2. Every node a tool returns passes visibility rule 1 for that caller (`src/access/visible.ts`: the user, their teams, documents any of them can read, the projects those documents belong to, other principals who can read a visible document; never channels or tickets). A hidden node is "not found", indistinguishable from a missing one. An edge is returned only when both ends are visible.
3. `brain.search` matches `title` through `searchTitles`: `%`, `_` and `\` are literal, ASCII is case-insensitive, other characters match as written; capped at `limit` (default 20, max 100). Empty or blank query: `INVALID_ARGUMENT`.
4. `brain.node` returns the node and its visible edges; `asOf` uses the bitemporal read and is `NOT_FOUND` before the node existed.
5. `brain.graph` pages the visible graph by an opaque cursor (default 5,000, max 20,000); each node carries `group` = `kind:source`.
6. `brain.connectors` lists the caller's linked accounts by provider id with `status` and `linkedAt`, no tokens, ever. Every tool output, error result, resource and the 401 body are checked against token-shaped patterns.
7. Sessions: `Mcp-Session-Id` per client, in memory, bound to the user who opened it, capped at `limits.sessions` (default 10,000) with least-recently-used eviction that closes the transport. An evicted, deleted or another user's session id answers 404 so the client re-initializes; a non-initialize request with no session id is 400. Bodies above `limits.body` (default 1 MiB) are 413; exactly 1 MiB is accepted.
8. A tool error is an MCP `isError` result with `structuredContent: { code, message }` and code `NOT_FOUND`, `INVALID_ARGUMENT`, `UNAUTHENTICATED` or `INTERNAL`, never a thrown 500. `INTERNAL` says only "internal error". The transport's own errors (bad JSON-RPC) are the SDK's.
9. Stdio is not served. Local clients use the HTTP URL; the install guide says so.
10. The install guide adds `kiro` (`.kiro/settings/mcp.json`, `mcpServers.<name>.url`) and `antigravity` (`~/.gemini/config/mcp_config.json`, `mcpServers.<name>.serverUrl`, the key `agy mcp add` writes). Both keep every field in `unconfirmed` until a maintainer checks the vendor docs (identity rule 10). Claude Code stays first.
11. Concurrency: two clients of one user and one client of another, interleaved, each see only their own session and their own visible set.
12. Budget: `brain.search` p99 under 50 ms at 100k nodes per tenant; `tools/list` under 5 ms at the median. Both print p50 and p99.

## Acceptance tests (written first)
- unit (brain-mcp): schemas, error mapping, session cap/eviction/owner, visibility point check.
- unit (graph-store `tests/unit/search/`): `searchTitles` escaping, case, paging, asOf, tenants.
- unit (identity `tests/unit/install/agents.test.ts`, golden): kiro and antigravity templates.
- integration: real SDK `Client` over `StreamableHTTPClientTransport` against the booted app with
  real identity tokens: tools, 401, cross-user and cross-tenant visibility, leaks, sessions, 413.
- scale: 100k nodes, latency printed. e2e (`BRAIN_E2E=1`): `claude`, `codex`, `kiro-cli` and `agy`
  read the rendered configs; a missing CLI prints `SKIP <cli> e2e: <reason>`.
- mutation: Stryker break at 80 on `src/**` except `index.ts`.

## Layout
`services/brain-mcp/{src/{tools/{search,node,graph,connectors,schema}.ts,server/{mount,sessions,errors}.ts,resources/node.ts,access/visible.ts,index.ts},tests/{unit,integration,scale,e2e,support}}`;
`features/graph-store/src/` gains `searchTitles`; `features/identity/src/install/templates.ts`
gains two entries (split the file if it passes 80 lines).

## Out of scope
Write tools (read-only over MCP in this slice), prompts, sampling, stdio transport, token refresh.
