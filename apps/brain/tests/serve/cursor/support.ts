import { createServer } from "node:net";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createGraphStore } from "@anvesx/graph-store";
import { createIdentity } from "@anvesx/identity";
import { startBrain } from "../../../src/serve/local/start.js";

export const SECRET = "brain-serve-cursor-test-secret-".padEnd(44, "0"); // low-entropy on purpose: a literal here trips the secret scanner

/** Asks the OS for a free port, then releases it, so BRAIN_BASE_URL is known before the app binds. */
const freePort = () =>
  new Promise<number>((done) => {
    const probe = createServer().listen(0, "127.0.0.1", () => {
      const { port } = probe.address() as { port: number };
      probe.close(() => done(port));
    });
  });

/** Boots the real binary entry point (`startBrain`) on a free port over the shared databases in `dir`. */
export async function boot(dir: string, closers: (() => Promise<void>)[]) {
  const port = await freePort();
  const env = {
    BRAIN_GRAPH_PATH: join(dir, "g.db"),
    BRAIN_AUTH_DB: join(dir, "a.db"),
    BRAIN_AUTH_SECRET: SECRET,
    BRAIN_PORT: String(port),
    BRAIN_BASE_URL: `http://localhost:${port}`,
  };
  const { app } = await startBrain(env);
  closers.push(() => app.close());
  return { base: env.BRAIN_BASE_URL };
}

/**
 * Gives the signed-in person `count` readable documents. startBrain keeps its identity private, so a
 * second identity port on the same auth database resolves the tenant, and a second graph-store handle
 * on the same SQLite file writes the nodes (both close before returning).
 */
export async function seed(dir: string, base: string, cookie: string, count: number) {
  const database = new DatabaseSync(join(dir, "a.db"));
  const who = await createIdentity({ baseUrl: base, secret: SECRET, database, resource: `${base}/mcp` }).port.fromSession(new Headers({ cookie }));
  database.close();
  if (!who) throw new Error("sign-up left no session");
  const store = createGraphStore({ path: join(dir, "g.db") });
  const node = (id: string, kind: "person" | "document") => ({
    tenant: who.tenant,
    id,
    kind,
    source: "drive",
    address: `x://${id}`,
    title: id,
    version: "1",
    props: {},
  });
  store.upsertNode(node(who.user, "person"), 1);
  for (let i = 1; i <= count; i++) {
    store.upsertNode(node(`d-${i}`, "document"), 1);
    store.addEdge({ tenant: who.tenant, from: who.user, to: `d-${i}`, kind: "can-read", source: "drive" }, 1);
  }
  store.close();
}
