import { mkdtempSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createGraphStore, type GraphStore } from "@anvesx/graph-store";
import { createIdentity, type IdentityConfig, migrateDatabase } from "@anvesx/identity";
import { openDb, tempDbPath } from "../../../../features/identity/tests/support/db.js";
import { type BrainDeps, createBrainApp } from "../../src/app.js";
import { cursorKeyFrom } from "../../src/serve/key.js";

// Reused from identity's own suite: a real cookie-keeping client, real sign-up and the full
// OAuth 2.1 flow that ends in an MCP bearer token.
export { Browser, signUp } from "../../../../features/identity/tests/support/http.js";
export { bearer, connect } from "../../../../features/identity/tests/support/oauth.js";

const SECRET = "brain-identity-test-secret-0123456789ab";

/** Asks the OS for a free port, then releases it, so identity knows its base URL before the app binds. */
const freePort = () =>
  new Promise<number>((done) => {
    const probe = createServer().listen(0, "127.0.0.1", () => {
      const { port } = probe.address() as { port: number };
      probe.close(() => done(port));
    });
  });

export type Env = Awaited<ReturnType<typeof bootBrain>>;

/**
 * The real brain app on one origin: identity's routes, /v1/documents behind identity.protect and the
 * graph view. A temp-file graph store and a temp-file SQLite auth database.
 */
export async function bootBrain(extra: Partial<BrainDeps> = {}) {
  const port = await freePort();
  const base = `http://localhost:${port}`;
  const db = openDb(tempDbPath());
  const config: IdentityConfig = { baseUrl: base, secret: SECRET, database: db, resource: `${base}/mcp` };
  await migrateDatabase(config);
  const identity = createIdentity(config);
  await identity.migrate();
  const store: GraphStore = createGraphStore({ path: join(mkdtempSync(join(tmpdir(), "brain-")), "graph.sqlite") });
  const app = createBrainApp({ store, identity, cursorKey: cursorKeyFrom(SECRET), port, host: "127.0.0.1", ...extra });
  await app.listen();
  const close = async () => {
    await app.close();
    store.close();
    db.close();
  };
  return { base, store, identity, close };
}

/** The tenant and user identity assigned to a signed-in browser. */
export async function whoIs(env: Env, cookie: string): Promise<{ tenant: string; user: string }> {
  const caller = await env.identity.port.fromSession(new Headers({ cookie }));
  if (!caller) throw new Error("the browser has no live session");
  return { tenant: caller.tenant, user: caller.user };
}

/** Gives `user` one readable document "d-1" and leaves "d-2" in the same tenant that nobody gave them. */
export function seedDocs(store: GraphStore, tenant: string, user: string) {
  const n = (id: string, kind: "person" | "document") => ({
    tenant,
    id,
    kind,
    source: "drive",
    address: `https://drive.example.com/${id}`,
    title: `title of ${id}`,
    version: "1",
    props: {},
  });
  for (const x of [n(user, "person"), n("d-1", "document"), n("d-2", "document")]) store.upsertNode(x, 1);
  store.addEdge({ tenant, from: user, to: "d-1", kind: "can-read", source: "drive" }, 1);
}
