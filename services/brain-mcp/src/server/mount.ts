import { randomUUID } from "node:crypto";
import type { AsyncGraphStore } from "@anvesx/graph-store";
import type { Caller } from "@anvesx/identity";
import { StreamableHTTPTransport } from "@hono/mcp";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { type Context, Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { bearerOnly, type Protect } from "../access/bearer.js";
import { createBrainServer } from "./build.js";
import { createSessions } from "./sessions.js";

export interface BrainMcpDeps {
  store: AsyncGraphStore;
  /** Identity's guard: answers 401 with the challenge unless the bearer token is valid. */
  protect: Protect;
  accounts: (user: string) => Promise<Record<string, unknown>[]>;
  limits?: { sessions: number; body: number };
}

type Env = { Variables: { caller: Caller } };
const MiB = 1024 * 1024;

/** A JSON-RPC error body with an HTTP status, for the cases the transport does not answer itself. */
const fail = (c: Context, status: 400 | 404 | 413, code: number, message: string) => c.json({ jsonrpc: "2.0", error: { code, message }, id: null }, status);

/** Mounts `/mcp` on the app: token check, then the size limit, then the session. */
export function mountBrainMcp(app: Hono, deps: BrainMcpDeps): void {
  const { sessions: cap, body: maxSize } = deps.limits ?? { sessions: 10_000, body: MiB };
  const sessions = createSessions<StreamableHTTPTransport>(cap);
  const mcp = new Hono<Env>();

  // The token is checked first, so a caller with a bad token learns nothing about size limits.
  // Bearer only: a browser session cookie is never accepted here (see access/bearer.ts).
  const protect = bearerOnly(deps.protect);
  mcp.use((c, next) =>
    protect(async (_req, caller) => {
      c.set("caller", caller);
      await next();
      return c.res;
    })(c.req.raw),
  );
  mcp.use(
    bodyLimit({
      maxSize,
      onError: async (c) => {
        // Read and drop the rest of the upload without keeping it. Answering while the client is still sending resets the connection.
        for await (const _chunk of c.req.raw.body ?? []) void _chunk;
        return fail(c, 413, -32600, "request body too large");
      },
    }),
  );

  mcp.all("/", async (c) => {
    const caller = c.get("caller");
    const id = c.req.header("mcp-session-id");
    if (id !== undefined) {
      const transport = sessions.get(id, caller);
      // 404 tells the client to start a new session. Unknown, evicted and another user's look the same.
      if (transport === undefined) return fail(c, 404, -32001, "session not found");
      return (await transport.handleRequest(c)) ?? c.body(null, 202);
    }
    const body: unknown = c.req.method === "POST" ? await c.req.json().catch(() => undefined) : undefined;
    if (c.req.method === "POST" && body === undefined) return fail(c, 400, -32700, "parse error");
    if (![body].flat().some(isInitializeRequest)) return fail(c, 400, -32600, "Mcp-Session-Id header is required");

    const server = createBrainServer({ store: deps.store, caller, accounts: deps.accounts });
    const transport: StreamableHTTPTransport = new StreamableHTTPTransport({
      sessionIdGenerator: randomUUID,
      enableJsonResponse: true,
      onsessioninitialized: (sid) => {
        sessions.add(sid, caller, transport);
        server.server.onclose = () => void sessions.delete(sid); // forget the session once its transport closes
      },
    });
    await server.connect(transport);
    return (await transport.handleRequest(c, body)) ?? c.body(null, 202);
  });
  app.route("/mcp", mcp);
}
