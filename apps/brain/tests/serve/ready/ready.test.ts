import { createPostgresGraphStore } from "@anvesx/graph-store";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startPostgres, type Throwaway } from "../../../../../features/graph-store/tests/support/pg/server.js";
import { serve } from "../../../src/serve/serve.js";
import { type BootDeps, realDeps } from "../../../src/serve/startup.js";
import { env, freshDb, until } from "../boot.js";

// spec deploy, Behaviour 9: /healthz must not say "ok" before the routes exist. The pool answers `select 1` from the first
// moment, but identity and the graph are still being built; a 200 then would route traffic into 503s (the CI image test
// did exactly that: it waited for 200, then sign-up answered 503). Real server, real Postgres; the only injection is a
// delay around the real graph-store constructor (serve's `deps` seam), so the boot is still running when we look.
let db: Throwaway | undefined;
beforeAll(async () => {
  try {
    db = await startPostgres();
  } catch (e) {
    if (process.env["CI"] === "true") throw e;
    console.warn(`SKIPPED: readiness tests need Postgres (${(e as Error).message})`);
  }
}, 60_000);
afterAll(() => db?.stop());

const STORE_MS = 1500;
const slow: BootDeps = {
  ...realDeps,
  createPostgresGraphStore: async (o) => {
    await new Promise((r) => setTimeout(r, STORE_MS));
    return createPostgresGraphStore(o);
  },
};

describe("/healthz readiness", () => {
  it("answers 503 while the routes are still being built, then 200, and the routes work from that first 200", async (ctx) => {
    if (!db) return ctx.skip();
    const server = await serve(env(await freshDb(db)), () => {}, slow);
    const base = `http://127.0.0.1:${server.port}`;
    try {
      // The store delay has not elapsed: the database is up, the routes are not.
      const early = await fetch(`${base}/healthz`);
      expect([early.status, await early.json()]).toEqual([503, { status: "unavailable" }]);
      expect((await fetch(`${base}/v1/documents`)).status).toBe(503);
      await until(async () => (await fetch(`${base}/healthz`)).status === 200, STORE_MS + 30_000);
      // The first 200 is a promise: a request that needs the routes is served now, not 503.
      expect((await fetch(`${base}/v1/documents`)).status).toBe(401); // no token: the gate answers, not the 503 stub
    } finally {
      await server.close();
    }
  });
});
