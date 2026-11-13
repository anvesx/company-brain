import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { Recheck } from "@anvesx/visibility/gate";
import { serve } from "@hono/node-server";
import { createFilesView, pgGate } from "../../../src/index.js";
import { type Claims, startOidc } from "./oidc.js";
import { startPg } from "./pg.js";

export * from "./dom/dom.js";

import { clusterRows, ids } from "./dom/dom.js";

const nextHref = (html: string): string | undefined => /href="([^"]*cursor=[^"]+)"/.exec(html)?.[1]?.replaceAll("&amp;", "&");

/**
 * Wiring used by every test: createFilesView({ pool, gate: await pgGate(pool, { recheck }), auth: verify }) where `verify` checks a
 * bearer JWT against a real HTTP JWKS endpoint. Pages are HTML; JSON is never assumed.
 */
export async function boot(opts: { recheck?: Recheck; top?: number } = {}) {
  const [db, oidc] = await Promise.all([startPg(), startOidc()]);
  const limits = { perCheckMs: 5_000, totalMs: 60_000, top: opts.top ?? 100_000 };
  const gate = await pgGate(db.pool, { recheck: opts.recheck ?? (async () => true), limits });
  const app = createFilesView({ pool: db.pool, gate, auth: oidc.verify });
  const server = serve({ port: 0, hostname: "127.0.0.1", fetch: app.fetch });
  await new Promise((ok) => server.once("listening", ok));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const call = async (path: string, who?: Claims | string) => {
    const token = typeof who === "string" ? who : who ? await oidc.token(who) : undefined;
    const res = await fetch(base + path, { redirect: "manual", headers: token ? { authorization: `Bearer ${token}` } : {} });
    return { status: res.status, headers: res.headers, body: await res.text() };
  };
  /** Follows the next-page link until the list ends; returns every file id and the page count. */
  const walk = async (path: string, who: Claims, limit = 100) => {
    const out: string[] = [];
    let url: string | undefined = `${path}${path.includes("?") ? "&" : "?"}limit=${limit}`;
    let pages = 0;
    while (url) {
      const r = await call(url, who);
      if (r.status !== 200) throw new Error(`walk ${url}: ${r.status}`);
      out.push(...ids(r.body));
      url = nextHref(r.body);
      pages++;
    }
    return { ids: out, pages };
  };
  /** Every cluster the viewer is shown: the tree page nests three levels, so one request covers the whole tree. */
  const tree = async (who: Claims, path = "/clusters?limit=100") => {
    const r = await call(path, who);
    if (r.status !== 200) throw new Error(`tree ${path}: ${r.status}`);
    return new Map(clusterRows(r.body).map((row) => [row.id, row]));
  };
  const stop = async () => {
    (server as Server).closeAllConnections();
    await new Promise((ok) => server.close(ok));
    await oidc.stop();
    await db.stop();
  };
  return { ...db, oidc, base, call, walk, tree, stop };
}
export type Env = Awaited<ReturnType<typeof boot>>;
