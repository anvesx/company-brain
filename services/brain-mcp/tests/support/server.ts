import { randomBytes } from "node:crypto";
import type { AddressInfo } from "node:net";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { type AsyncGraphStore, createPostgresGraphStore, toAsync } from "@anvesx/graph-store";
import { createIdentity, type IdentityConfig, migrateDatabase } from "@anvesx/identity";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { factories, schemaPool } from "../../../../features/graph-store/tests/support/pg/factories.js";
import { tempDbPath } from "../../../../features/identity/tests/support/db.js";
import { mountBrainMcp } from "../../src/index.js";
import { tempStore, track } from "./graph.js";

/** The identity test helper makes the folder; we register it so it is deleted with the rest. */
const tempAuthPath = (): string => {
  const path = tempDbPath();
  track(dirname(path));
  return path;
};

/**
 * The two stores brain-mcp runs on, modelled on graph-store's tests/support/pg/factories.ts: SQLite through `toAsync`,
 * and Postgres in a fresh schema of a throwaway server. `skip` says why one cannot run on this machine (CI never skips).
 * Stores come from this package's own `@anvesx/graph-store` import, so its GraphError is the class brain-mcp checks.
 */
export const storeFactories: { name: "sqlite" | "postgres"; skip: string | undefined; open(): Promise<AsyncGraphStore> }[] = [
  { name: "sqlite", skip: undefined, open: async () => toAsync(tempStore()) },
  {
    name: "postgres",
    skip: factories.find((f) => f.name === "postgres")!.skip,
    open: async () => createPostgresGraphStore({ pool: await schemaPool(`m_${randomBytes(6).toString("hex")}`) }),
  },
];

const SECRET = "brain-mcp-test-secret-0123456789abcdef";

export type BrainEnv = Awaited<ReturnType<typeof bootBrain>>;

/**
 * Identity and brain-mcp behind one real HTTP server on a free port, each over its own temp SQLite file.
 * Mirrors features/identity/tests/support/server.ts, but mounts the real /mcp instead of an echo, and
 * imports identity from its package so errors thrown inside identity are the same classes brain-mcp sees.
 */
export async function bootBrain(limits?: { sessions: number; body: number }) {
  let app = new Hono();
  const server = serve({ port: 0, fetch: (req, env) => app.fetch(req, env) });
  await new Promise((done) => server.once("listening", done));
  const base = `http://localhost:${(server.address() as AddressInfo).port}`;
  const db = new DatabaseSync(tempAuthPath());
  const config: IdentityConfig = { baseUrl: base, secret: SECRET, database: db, resource: `${base}/mcp`, sendEmail: async () => undefined };
  await migrateDatabase(config);
  const identity = createIdentity(config);
  await identity.migrate();
  const ctx = (await identity.auth.$context) as unknown as { checkSchema?: () => Promise<unknown> | undefined };
  await ctx.checkSchema?.();
  const store = tempStore();
  // Real account rows straight from the identity database, tokens included: the tool must whitelist fields.
  const accounts = async (user: string) => db.prepare("SELECT * FROM account WHERE userId = ?").all(user) as Record<string, unknown>[];
  app = new Hono();
  app.route("/", identity.routes);
  mountBrainMcp(app, { store: toAsync(store), protect: identity.protect, accounts, ...(limits ? { limits } : {}) });
  const close = () =>
    new Promise<void>((done) => {
      if ("closeAllConnections" in server) server.closeAllConnections();
      server.close(() => done());
      store.close();
      db.close();
    });
  return { base, url: `${base}/mcp`, db, store, identity, config, close };
}
