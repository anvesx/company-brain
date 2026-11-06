import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startPostgres, type Throwaway } from "../../../../features/graph-store/tests/support/pg/server.js";
import { serve } from "../../src/serve/serve.js";
import { env, until } from "./boot.js";
import { seed, signUp, type Who } from "./session.js";

// The real server (identity + graph + health) on a real Postgres. No mocks. CI=true makes a missing Postgres a failure.
let db: Throwaway | undefined;
let running: Awaited<ReturnType<typeof serve>> | undefined;
let base = "";
let me: { cookie: string; who: Who } | undefined;
beforeAll(async () => {
  try {
    db = await startPostgres();
  } catch (e) {
    if (process.env["CI"] === "true") throw e;
    return console.warn(`serve tests skipped: ${(e as Error).message}`);
  }
  running = await serve(env(db.url), () => {});
  base = `http://127.0.0.1:${running.port}`;
  await until(async () => (await fetch(`${base}/v1/documents`)).status === 401, 30_000);
  me = await signUp(base, db.url);
  await seed(db.url, me.who);
}, 90_000);
afterAll(async () => {
  await running?.close();
  db?.stop();
});

describe("brain serve on Postgres", () => {
  it("answers /healthz 200 ok with no token", async (ctx) => {
    if (!running) return ctx.skip();
    const res = await fetch(`${base}/healthz`);
    expect([res.status, await res.json()]).toEqual([200, { status: "ok" }]);
  });

  it("serves the graph from Postgres and refuses a request without a session", async (ctx) => {
    if (!running || !me) return ctx.skip();
    const ok = await fetch(`${base}/v1/documents`, { headers: { cookie: me.cookie } });
    expect((await ok.json()).documents.map((d: { id: string }) => d.id)).toEqual(["d1"]);
    expect((await fetch(`${base}/v1/documents`)).status).toBe(401);
  });

  it("mounts identity: email sign-up works under /api/auth", async (ctx) => {
    if (!running) return ctx.skip();
    const body = JSON.stringify({ email: `a${randomBytes(4).toString("hex")}@brain.test`, password: randomBytes(12).toString("hex"), name: "A" });
    const res = await fetch(`${base}/api/auth/sign-up/email`, {
      method: "POST",
      body,
      headers: { "content-type": "application/json", origin: "http://localhost" },
    });
    expect(res.status).toBe(200);
  });

  it("recovers to 200 after a Postgres crash and restart, without restarting the process", async (ctx) => {
    if (!running || !db || !me) return ctx.skip();
    db.restart();
    await until(async () => (await fetch(`${base}/healthz`)).status === 200, 30_000);
    const ok = await fetch(`${base}/v1/documents`, { headers: { cookie: me.cookie } });
    expect(ok.status).toBe(200);
  });

  it("starts and answers 503 unavailable when the database is unreachable", async () => {
    const dead = await serve(env("postgres://postgres:x@127.0.0.1:1/postgres"), () => {});
    const res = await fetch(`http://127.0.0.1:${dead.port}/healthz`);
    expect([res.status, await res.json()]).toEqual([503, { status: "unavailable" }]);
    expect((await fetch(`http://127.0.0.1:${dead.port}/v1/documents`)).status).toBe(503);
    await dead.close();
  });
});
