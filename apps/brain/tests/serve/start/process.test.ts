import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startPostgres, type Throwaway } from "../../../../../features/graph-store/tests/support/pg/server.js";
import { serve } from "../../../src/serve/serve.js";
import { env, freshDb, until } from "../boot.js";

// Start-up failures, checked on the real process (`node dist/bin.js serve`) and the real server. Needs `pnpm build` first.
const bin = fileURLToPath(new URL("../../../dist/bin.js", import.meta.url));
if (!existsSync(bin)) throw new Error("dist/bin.js is missing: run `pnpm --filter @anvesx/brain-app build` first"); // build is a prerequisite: fail, never skip
let db: Throwaway | undefined;
beforeAll(async () => {
  try {
    db = await startPostgres();
  } catch (e) {
    if (process.env["CI"] === "true") throw e;
    console.warn(`startup tests skipped: ${(e as Error).message}`);
  }
}, 60_000);
afterAll(() => db?.stop());

/** Run `brain serve` with this env; resolves with its exit code and stderr. Killed after 20 s so a hang fails, not blocks. */
const run = (e: Record<string, string>): Promise<{ code: number | null; err: string }> =>
  new Promise((ok) => {
    const child = spawn("node", [bin, "serve"], { env: { PATH: process.env["PATH"] ?? "", ...e } });
    let err = "";
    child.stderr.on("data", (d) => (err += d));
    const timer = setTimeout(() => child.kill("SIGKILL"), 20_000);
    child.on("exit", (code) => {
      clearTimeout(timer);
      ok({ code, err });
    });
  });

describe("brain serve start-up errors exit 1 with one clear line", () => {
  it("a BRAIN_AUTH_SECRET shorter than 32 characters", async () => {
    const r = await run({ ...env("postgres://x:y@127.0.0.1:1/z"), BRAIN_AUTH_SECRET: "short" });
    expect(r.code).toBe(1);
    expect(r.err).toContain("brain: BRAIN_AUTH_SECRET must be at least 32 characters");
  });

  it("a port that is already in use", async () => {
    const taken = createServer().listen(0, "127.0.0.1");
    await new Promise((ok) => taken.once("listening", ok));
    const { port } = taken.address() as { port: number };
    const r = await run({ ...env("postgres://x:y@127.0.0.1:1/z"), PORT: String(port) });
    taken.close();
    expect(r.code).toBe(1);
    expect(r.err).toContain(`brain: port ${port} in use`);
  });

  it("a wrong database password is fatal, not retried forever", async (ctx) => {
    if (!db) return ctx.skip();
    const r = await run(env(db.url.replace(/:[0-9a-f]+@/, ":wrong@")));
    expect(r.code).toBe(1);
    expect(r.err).toContain("brain: password authentication failed");
  });
});

describe("brain serve retries and races", () => {
  it("keeps retrying a refused connection, and 15 retries add at most one pool 'error' listener", async () => {
    const logs: string[] = [];
    const s = await serve({ ...env("postgres://postgres:x@127.0.0.1:1/postgres"), BRAIN_RETRY_MS: "20" }, (m) => logs.push(m));
    await until(async () => logs.filter((l) => l.includes("retrying")).length >= 15, 20_000);
    expect(s.pool.listenerCount("error")).toBeLessThanOrEqual(1);
    await s.close();
  });

  it("two boots on one fresh database both come up with no 'already exists' error and no retry", async (ctx) => {
    if (!db) return ctx.skip();
    const url = await freshDb(db);
    const logs: string[] = [];
    const [a, b] = await Promise.all([serve(env(url), (m) => logs.push(m)), serve(env(url), (m) => logs.push(m))]);
    for (const s of [a, b]) await until(async () => (await fetch(`http://127.0.0.1:${s.port}/v1/documents`)).status === 401, 30_000);
    expect(logs.filter((l) => /already exists|retrying/.test(l))).toEqual([]);
    await Promise.all([a.close(), b.close()]);
  });
});
