import { GraphError } from "@anvesx/graph-store";
import { type Caller, IdentityError, type IdentityPort } from "@anvesx/identity";
import type { Hono } from "hono";
import { checkKey, digits } from "../query/limits.js";
import { type Aliases, visibleGraph } from "../query/page.js";
import type { ViewStore } from "../query/visible.js";

const NO_STORE = { "cache-control": "no-store" };

/**
 * GET /v1/graph: the caller's own view of the graph. Tenant and user come from the session or the MCP bearer
 * token and from nowhere else, so no query parameter can widen what a person sees.
 */
export function mountApi(
  app: Hono,
  { store, port, aliases, cursorKey }: { store: ViewStore; port: IdentityPort; aliases?: Aliases; cursorKey: Uint8Array },
): void {
  checkKey(cursorKey); // fail at mount, not on the first "Load more"
  app.get("/v1/graph", async (c) => {
    let caller: Caller;
    try {
      caller = await port.require(c.req.raw.headers);
    } catch (error) {
      if (!(error instanceof IdentityError)) throw error;
      // Same challenge identity's own guard sends: it points an MCP client at the protected-resource metadata.
      const challenge = `Bearer resource_metadata="${new URL(c.req.url).origin}/.well-known/oauth-protected-resource/mcp"`;
      return c.json({ error: "unauthorized", code: error.code }, 401, { ...NO_STORE, "www-authenticate": challenge });
    }
    const { limit, cursor, asOf } = c.req.query();
    try {
      const query = {
        cursorKey,
        tenant: caller.tenant,
        user: caller.user,
        aliases: await aliases?.(caller.user),
        limit: digits(limit),
        cursor,
        asOf: digits(asOf),
      };
      return c.json(await visibleGraph(store, query), 200, NO_STORE);
    } catch (error) {
      if (!(error instanceof GraphError) || error.code !== "BAD_INPUT") throw error;
      return c.json({ error: "bad_input", message: error.message }, 400, NO_STORE);
    }
  });
}
