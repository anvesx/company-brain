import type { AddressInfo } from "node:net";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { createIdentity, type IdentityConfig, type OutgoingEmail } from "../../src/index.js";
import { openDb, tempDbPath } from "./db.js";

export const SECRET = "identity-test-secret-0123456789abcdef";

/** A clock the test moves by hand. It starts at the wall clock so rows better-auth stamps agree. */
export const testClock = () => {
  let at = Date.now();
  return {
    now: () => at,
    advance: (ms: number) => {
      at += ms;
    },
  };
};

export type Env = Awaited<ReturnType<typeof boot>>;

/** Starts createIdentity behind a real HTTP server on a free port over a fresh SQLite file. */
export async function boot(extra: Partial<IdentityConfig> = {}, path: string = tempDbPath()) {
  const hits = new Map<string, number>();
  let app = new Hono();
  const server = serve({
    port: 0,
    fetch: (req, env) => {
      const at = new URL(req.url).pathname;
      hits.set(at, (hits.get(at) ?? 0) + 1);
      return app.fetch(req, env);
    },
  });
  await new Promise((done) => server.once("listening", done));
  const base = `http://localhost:${(server.address() as AddressInfo).port}`;
  const db = openDb(path);
  const clock = testClock();
  const mail: OutgoingEmail[] = [];
  const config: IdentityConfig = {
    baseUrl: base,
    secret: SECRET,
    database: db,
    resource: `${base}/mcp`,
    now: clock.now,
    sendEmail: async (message) => void mail.push(message),
    ...extra,
  };
  const identity = createIdentity(config);
  await identity.migrate();
  app = new Hono();
  app.route("/", identity.routes);
  app.all("/mcp", (c) => identity.protect(async (_req, caller) => Response.json(caller))(c.req.raw));
  const close = () =>
    new Promise<void>((done) => {
      if ("closeAllConnections" in server) server.closeAllConnections();
      server.close(() => done());
      db.close();
    });
  return { base, path, db, clock, mail, hits, identity, config, close };
}
