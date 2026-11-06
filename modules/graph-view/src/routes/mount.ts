import type { GraphStore } from "@anvesx/graph-store";
import { IdentityError, type IdentityPort } from "@anvesx/identity";
import type { Hono } from "hono";
import { pageScript } from "../page/script.js";
import { STYLE } from "../page/style.js";
import { graphPage, IMPORT_MAP_HASH } from "../page/view.js";
import type { Aliases } from "../query/page.js";
import { mountApi } from "./api.js";
import { mountAssets } from "./assets.js";

// Spec rule 5: only this origin's files run or load, nothing is framed, no plugin content. The one inline script, the import map, is allowed by its hash.
const CSP = [
  "default-src 'self'",
  `script-src 'self' ${IMPORT_MAP_HASH}`,
  "style-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
].join("; ");
const CACHED = { "cache-control": "public, max-age=3600" };

/**
 * Adds the graph view to a Hono app: the page, its script, the JSON route and the library files.
 * Anything else under these paths is the app's own 404.
 */
export function mountGraphView(app: Hono, deps: { store: GraphStore; port: IdentityPort; aliases?: Aliases; cursorKey: Uint8Array }): void {
  const script = pageScript();
  mountAssets(app);
  mountApi(app, deps);
  app.get("/graph.js", () => new Response(script, { headers: { "content-type": "text/javascript; charset=utf-8", ...CACHED } }));
  app.get("/graph.css", () => new Response(STYLE, { headers: { "content-type": "text/css; charset=utf-8", ...CACHED } }));
  app.get("/graph", async (c) => {
    // Only a session opens the page; a bearer token alone is not a sign-in (spec rule 4).
    const caller = await deps.port.fromSession(c.req.raw.headers).catch((error: unknown) => {
      if (error instanceof IdentityError) return null;
      throw error;
    });
    if (!caller) return c.redirect("/sign-in", 302);
    c.header("content-security-policy", CSP);
    c.header("cache-control", "no-store"); // the page is for the signed-in person only, so no cache may keep it
    return c.html(graphPage());
  });
}
