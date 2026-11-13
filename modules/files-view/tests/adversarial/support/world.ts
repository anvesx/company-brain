import { type AsyncGraphStore, createPostgresGraphStore } from "@anvesx/graph-store";
import type { Doc } from "@anvesx/visibility/gate";
import { serve } from "@hono/node-server";
import pg from "pg";
import { startPostgres, type Throwaway } from "../../../../../features/graph-store/tests/support/pg/server.js";
import { pgGate } from "../../../src/gate/gate.js";
import { createFilesView, jwtAuth } from "../../../src/index.js";
import { AUD, type Claims, ISS, oidc } from "./oidc.js";
import { seeder } from "./seed.js";

export type { FileOpt } from "./seed.js";

/** Throwaway Postgres + real OIDC + real HTTP server over createFilesView. Wiring lives only here. */
export async function boot() {
  const db: Throwaway = await startPostgres();
  const pool = new pg.Pool({ connectionString: db.url, max: 20 });
  pool.on("error", () => undefined);
  const store: AsyncGraphStore = await createPostgresGraphStore({ pool });
  const idp = await oidc();
  const w = { recheck: (async () => true) as (d: Doc, c: { user: string; tenant: string }) => Promise<boolean> };
  const gate = await pgGate(pool, { recheck: (d, c) => w.recheck(d, c), limits: { perCheckMs: 800, totalMs: 1200 } });
  const app = createFilesView({ pool, gate, auth: jwtAuth({ jwksUrl: idp.jwksUrl, issuer: ISS, audience: AUD }) });
  const server = serve({ port: 0, fetch: app.fetch });
  await new Promise((ok) => server.once("listening", ok));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const { file, cluster, link, bulk } = seeder(pool, store);
  const token = (c: Claims) => idp.sign(c);
  const get = async (path: string, c?: Claims | string, init: RequestInit = {}) => {
    const bearer = typeof c === "string" ? c : c ? await token(c) : undefined;
    const r = await fetch(base + path, {
      redirect: "manual",
      ...init,
      headers: { ...(bearer ? { authorization: `Bearer ${bearer}` } : {}), ...(init.headers as object) },
    });
    return { status: r.status, headers: r.headers, body: await r.text() };
  };
  const close = async () => {
    (server as unknown as { closeAllConnections?: () => void }).closeAllConnections?.();
    server.close();
    idp.close();
    await pool.end();
    db.stop();
  };
  return { w, pool, store, idp, file, cluster, link, bulk, get, token, base, close };
}
export type World = Awaited<ReturnType<typeof boot>>;
export const A: Claims = { tenant: "t1", user: "alice" };
export const B: Claims = { tenant: "t1", user: "bob" };
export const X: Claims = { tenant: "t2", user: "xena" };
/** Titles the page links to, in order (data-id or /files/<id> hrefs). */
export const ids = (html: string): string[] => [...html.matchAll(/href="\/files\/([^"?#]+)"/g)].map((m) => decodeURIComponent(m[1] ?? ""));
