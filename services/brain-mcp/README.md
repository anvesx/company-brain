# @anvesx/brain-mcp

One MCP Streamable HTTP endpoint, `/mcp`, over the company graph. Every agent client (Claude Code,
Claude Desktop, Codex, Kiro, Antigravity, Cursor, Gemini CLI) connects with the user's own sign-in
through the identity OAuth server and sees only what that user may see. Read-only: four tools and one
resource. No stdio transport.

Status: implemented. Brief: `docs/briefs/brain-mcp.md`. Spec: `docs/specs/feature/mcp-server.md`.
Limits and design notes: `src/tools/README.md`. Client setup: `tests/support/cli/README.md` and the install guide.

## Interface

```ts
mountBrainMcp(app: Hono, deps: {
  store: GraphStore;                                   // @anvesx/graph-store
  protect: ReturnType<typeof createIdentity>["protect"]; // @anvesx/identity: 401 + challenge
  accounts: (user: string) => Promise<Record<string, unknown>[]>; // linked provider rows
  limits?: { sessions: number; body: number };         // default 10,000 sessions, 1 MiB body
}): void
```

| Tool               | Input                                | Output                                       |
| ------------------ | ------------------------------------ | -------------------------------------------- |
| `brain.search`     | `{ query, kinds?, limit?, cursor? }` | `{ nodes, next?, truncated? }`               |
| `brain.node`       | `{ id, asOf? }`                      | `{ node, neighbours }`                       |
| `brain.graph`      | `{ cursor?, limit? }`                | `{ nodes, edges, categories, next? }`        |
| `brain.connectors` | `{}`                                 | `{ providers: { id, status, linkedAt? }[] }` |

Resource: `brain://node/{id}`, JSON, visible nodes only.

## Run

```sh
pnpm --filter @anvesx/brain-mcp test       # unit + integration
pnpm --filter @anvesx/brain-mcp scale      # 100k-node latency, prints p50/p99; SKIPPED under load
pnpm --filter @anvesx/brain-mcp e2e        # real claude, codex, kiro-cli, agy CLIs
pnpm --filter @anvesx/brain-mcp mutation   # Stryker, break at 80
```

Build `@anvesx/graph-store` and `@anvesx/identity` first (`pnpm turbo build --filter @anvesx/brain-mcp^...`);
turbo's `test` task does it for you.

Auth: bearer token only. A request with just a session cookie gets 401 and a `WWW-Authenticate` challenge.
Browser MCP clients are unsupported (no CORS). Search is capped per call; see `src/tools/README.md`.
