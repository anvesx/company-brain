import type { AddressInfo } from "node:net";
import type { GraphStore } from "@anvesx/graph-store";
import { createIdentity, type IdentityConfig, migrateDatabase } from "@anvesx/identity";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { openDb, tempDbPath } from "../../../../features/identity/tests/support/db.js";
// Reused from identity's own suite: a real cookie-keeping client, real sign-up, and the full
// OAuth 2.1 flow that ends in an MCP bearer token. Nothing here imitates identity.
import { signUp } from "../../../../features/identity/tests/support/http.js";
import { mountGraphView } from "../../src/index.js";
import { edge, KEY, node, write } from "./store.js";

export { Browser, signUp } from "../../../../features/identity/tests/support/http.js";
export { bearer, connect } from "../../../../features/identity/tests/support/oauth.js";

const SECRET = "graph-view-test-secret-0123456789abcdef";

export type Env = Awaited<ReturnType<typeof boot>>;

/**
 * A real HTTP server on a free port: identity's routes (sign-up, sign-in, OAuth, JWKS) and the graph
 * view on one Hono app, over a fresh SQLite auth file. One origin, as in the brain app, so the session
 * cookie reaches /graph and fromBearer can fetch the JWKS from the same base URL.
 */
export async function boot(store: GraphStore, aliases?: (user: string) => Promise<string[]>, cursorKey: Uint8Array = KEY) {
  // Listen first: identity needs its own base URL, and the free port is only known once bound.
  let app = new Hono();
  const server = serve({ port: 0, fetch: (req, env) => app.fetch(req, env) });
  await new Promise((done) => server.once("listening", done));
  const base = `http://localhost:${(server.address() as AddressInfo).port}`;
  const db = openDb(tempDbPath());
  const config: IdentityConfig = { baseUrl: base, secret: SECRET, database: db, resource: `${base}/mcp` };
  await migrateDatabase(config);
  const identity = createIdentity(config);
  await identity.migrate();
  app = new Hono();
  app.route("/", identity.routes);
  mountGraphView(app, { store, port: identity.port, cursorKey, ...(aliases && { aliases }) });
  const close = () =>
    new Promise<void>((done) => {
      if ("closeAllConnections" in server) server.closeAllConnections();
      server.close(() => {
        db.close();
        done();
      });
    });
  return { base, identity, close };
}

/** A second graph-view server for the same store and identity (the cookie works on both), with its own cursor key. */
export async function another(env: Env, store: GraphStore, cursorKey: Uint8Array) {
  const app = new Hono();
  mountGraphView(app, { store, port: env.identity.port, cursorKey });
  const server = serve({ port: 0, fetch: app.fetch });
  await new Promise((done) => server.once("listening", done));
  const base = `http://localhost:${(server.address() as AddressInfo).port}`;
  const close = () =>
    new Promise<void>((done) => {
      if ("closeAllConnections" in server) server.closeAllConnections();
      server.close(() => done());
    });
  return { base, close };
}

/** The tenant (personal organization) and user id identity assigned to a signed-in browser. */
export async function whoIs(env: Env, cookie: string): Promise<{ tenant: string; user: string }> {
  const caller = await env.identity.port.fromSession(new Headers({ cookie }));
  if (!caller) throw new Error("the browser has no live session");
  return { tenant: caller.tenant, user: caller.user };
}

/** Signs a new person up and gives them one readable document, "<name> doc", in their own tenant. */
export async function personWithDoc(env: Env, store: GraphStore, name: string) {
  const p = await signUp(env, name);
  const who = await whoIs(env, p.browser.cookie());
  const doc = node(who.tenant, "d-1", "document", "gdrive", { title: `${name} doc` });
  write(store, 1, [node(who.tenant, who.user, "person", "slack"), doc], [edge(who.tenant, who.user, "d-1", "can-read")]);
  return { ...p, ...who };
}
