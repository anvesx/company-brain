# Brief: brain-mcp

Make the red suite green. One MCP Streamable HTTP endpoint, `/mcp`, over the graph, behind the
identity OAuth, read-only, four tools and one resource; plus `searchTitles` in graph-store and the
kiro and antigravity install templates. Spec: `docs/specs/feature/mcp-server.md`. Process:
`docs/agents/L8-BRIEF.md`.

- Registry decision (C1): **extract-and-compose**. Install nothing new beyond the pinned deps in
  `services/brain-mcp/package.json`. The SDK does the protocol, `@hono/mcp` the transport,
  `hono/body-limit` the 413, identity's `protect` the 401.
- Routing: builder **mid-engineer** (Sonnet), one session, about 4 hours. Independent PASS/FAIL by
  **verifier** (Sonnet) in a clean worktree. Human merge: no (no contract, migration or money);
  the lead reviews the diff against the contract.
- Size today: 75 red contract tests. brain-mcp 58 in 13 files (cannot import `src/`), graph-store 8
  (`searchTitles is not a function`), identity 9 (`agents.test.ts` 6, `render.test.ts` 3).

## Owner's rules (verbatim)

"no stubs, fakes or placeholder data; no tests just for green; OSI libraries only; minimal
hand-written code; inline comments a junior can read; inject clock and I/O; structure lint
`pnpm structure` must pass; commitlint subject lower-case; commit body lines at most 100 columns;
no attribution lines; never bypass hooks; never commit dist/; no stdio transport."

Also: each code file under 80 lines, at most five files per folder (README counted), a README in
every folder you create.

## Files you own (nobody else edits them)

| Path | Job |
| --- | --- |
| `services/brain-mcp/src/index.ts` | export `mountBrainMcp` (excluded from Stryker) |
| `services/brain-mcp/src/server/{mount,sessions,errors}.ts` + README | route, LRU, error mapping |
| `services/brain-mcp/src/tools/{schema,search,node,graph,connectors}.ts` | zod and handlers |
| `services/brain-mcp/src/resources/node.ts` + README | `brain://node/{id}` |
| `services/brain-mcp/src/access/visible.ts` + README | `viewer(store, {tenant,user}, asOf?)` |
| `services/brain-mcp/src/README.md` | replace the layout note with the real one |
| `features/graph-store/src/search.ts` (new), `src/index.ts`, `src/schema.ts` | `searchTitles` |
| `features/identity/src/install/templates.ts` | add `kiro` and `antigravity` |

`features/graph-store/src/index.ts` is already 80 lines: move code out before adding the method.
`tools/` holds five `.ts` files, so its README pushes it to six: put `schema.ts` there and move
one handler, or split `tools/` into `tools/` and `tools/read/`. Your call; `pnpm structure` decides.

## Contract files (do not edit; flag to the lead if one is wrong)

- `services/brain-mcp/tests/**` (unit, integration, scale, e2e, support, cli)
- `features/graph-store/tests/unit/search/**`
- `features/identity/tests/unit/install/agents.test.ts`, `features/identity/tests/install/{render.test.ts,golden.json}`

## Library signatures (quoted from the installed packages)

```ts
// @modelcontextprotocol/sdk 1.32.2, dist/esm/server/mcp.d.ts:161
registerTool<OutputArgs, InputArgs>(name: string, config: { title?: string; description?: string;
  inputSchema?: InputArgs; outputSchema?: OutputArgs; annotations?: ToolAnnotations;
  _meta?: Record<string, unknown> }, cb: ToolCallback<InputArgs>): RegisteredTool;
// mcp.d.ts:114
registerResource(name: string, uriOrTemplate: ResourceTemplate, config: ResourceMetadata,
  readCallback: ReadResourceTemplateCallback): RegisteredResourceTemplate;
// @hono/mcp 0.3.5, dist/index.d.mts
class StreamableHTTPTransport { sessionId?: string; onclose?: () => void;
  constructor(options?: StreamableHTTPServerTransportOptions & {...});
  handleRequest(ctx: Context, parsedBody?: unknown): Promise<Response | undefined>;
  close(): Promise<void>; }   // close() calls onclose()
// options (webStandardStreamableHttp.d.ts:48-73): sessionIdGenerator?: () => string;
//   onsessioninitialized?: (id) => void; onsessionclosed?: (id) => void; enableJsonResponse?: boolean
// hono/body-limit: bodyLimit({ maxSize: number, onError?: (c) => Response }): MiddlewareHandler
```

Input validation is the SDK's: a zod failure comes back as an `isError` result ("MCP error -32602:
Input validation error"). Output validation is skipped when `isError` is set, so error results do
not need to match `outputSchema`.

## Interfaces the tests import

```ts
mountBrainMcp(app, { store, protect, accounts, limits?: { sessions, body } }): void
INPUT: { search, node, graph, connectors }   // zod objects; TOOL_NAMES = ["brain.search",
                                             //   "brain.node", "brain.graph", "brain.connectors"]
createSessions(cap = DEFAULT_SESSION_CAP /* 10_000 */): { cap, add(id, owner, transport),
  get(id, owner), delete(id): boolean, size(): number }   // cap must be a positive integer
class ToolFailure(code, message); toToolResult(error): CallToolResult
viewer(store, { tenant, user }, asOf?): { sees(id): boolean; principals: Set<string> }
store.searchTitles(tenant, { text, kinds?, limit, after?, asOf? }): GraphNode[]
```

## Schemas, sessions and errors

| Tool | Input (zod) | Output |
| --- | --- | --- |
| `brain.search` | `query` string max 512 (empty passes zod), `kinds?` NodeKind[], `limit` int 1..100 default 20 | `{ nodes: {id,kind,source,title,group}[] }` |
| `brain.node` | `id` 1..512, `asOf?` finite | `{ node, neighbours }` |
| `brain.graph` | `cursor?` max 512, `limit` int 1..20000 default 5000 | `{ nodes, edges, categories, next? }` |
| `brain.connectors` | `{}` | `{ providers: { id, status, linkedAt? }[] }` |

| Request | Answer |
| --- | --- |
| no or bad bearer, any body size | 401 + `resource_metadata` challenge (protect runs before bodyLimit) |
| body over `limits.body` (1 MiB) | 413; exactly 1 MiB is 200 |
| no session id, not initialize | 400 |
| unknown, evicted, deleted or another user's session id | 404, `{ error: { code: -32001 } }` |

| Thrown | Result code | Message |
| --- | --- | --- |
| `ToolFailure` | its own code | its own |
| `GraphError` `BAD_INPUT` | `INVALID_ARGUMENT` | the store's |
| any `IdentityError` | `UNAUTHENTICATED` | the identity message |
| anything else | `INTERNAL` | "internal error" only |

Result shape: `{ isError: true, content: [{ type: "text", text: "CODE: message" }],
structuredContent: { code, message } }`. Hidden nodes are `NOT_FOUND`, worded as for missing ones.

## Rules to tests

| Spec rule | Test |
| --- | --- |
| 1 auth 401, token before size | `access.test.ts` authentication; `sessions.test.ts` 413 case |
| 2 visibility | `unit/visible.test.ts`; `access.test.ts` visibility through every tool |
| 3 search | graph-store `search.test.ts`; `tools.test.ts` brain.search cases |
| 4, 5 node, graph | `tools.test.ts` brain.node and brain.graph cases |
| 6 no tokens | `leaks.test.ts`; `tools.test.ts` brain.connectors |
| 7 sessions, 413 | `unit/sessions.test.ts`; `integration/sessions.test.ts` |
| 8 error results | `unit/errors.test.ts`; `unit/schema.test.ts` |
| 10 install templates | identity `agents.test.ts`, `render.test.ts` golden; `e2e/*.test.ts` |
| 11 concurrency | `sessions.test.ts` three interleaved clients |
| 12 budget | `scale/search.test.ts` (prints p50/p99) |

## Commands

```sh
pnpm install && pnpm turbo build --filter @anvesx/brain-mcp^...   # graph-store, identity dist
pnpm --filter @anvesx/graph-store test && pnpm --filter @anvesx/identity test
pnpm --filter @anvesx/brain-mcp test     # unit + integration
pnpm --filter @anvesx/brain-mcp scale    # paste the p50/p99 lines in the report
pnpm --filter @anvesx/brain-mcp e2e      # BRAIN_E2E=1; kiro-cli needs your login
pnpm --filter @anvesx/brain-mcp mutation # stryker.config.json mirrors services/graph-sync, break 80
pnpm structure && pnpm guard:fakes && pnpm lint && pnpm typecheck && pnpm deps
```

Rebuild graph-store after adding `searchTitles`: brain-mcp imports its `dist/`.

## Done means

1. Every command above exits 0; e2e prints no `SKIP` for `claude`, `codex`, `kiro-cli`, `agy`.
2. No diff under the contract files listed above.
3. Evidence: paste the vitest summary lines, the scale p50/p99 lines and the Stryker score.
4. Verifier PASS from a clean worktree.

## Out of scope

Write tools, prompts, sampling, stdio, token refresh, a shared visibility package (the rule is
duplicated from graph-view on purpose; extract it into graph-store as a later C2 step), and the
brain app wiring that mounts `/mcp` in production.
