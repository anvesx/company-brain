import { createServer, type Socket } from "node:net";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startPostgres, type Throwaway } from "../../../../features/graph-store/tests/support/pg/server.js";
import { databaseUp } from "../../src/serve/health.js";

// A real Postgres on this machine, no mocks. Under CI=true a missing Postgres fails the suite instead of skipping.
let pgServer: Throwaway | undefined;
let skip: string | undefined;
beforeAll(async () => {
  try {
    pgServer = await startPostgres();
  } catch (e) {
    if (process.env["CI"] === "true") throw e;
    skip = (e as Error).message;
    console.warn(`health tests skipped: ${skip}`);
  }
}, 60_000);
afterAll(() => pgServer?.stop());

describe("databaseUp", () => {
  it("is true while Postgres answers", async (ctx) => {
    if (!pgServer) return ctx.skip();
    const pool = new pg.Pool({ connectionString: pgServer.url });
    expect(await databaseUp(pool)).toBe(true);
    await pool.end();
  });

  it("is false, not a throw, when nothing listens on the port", async () => {
    const pool = new pg.Pool({ connectionString: "postgres://postgres:x@127.0.0.1:1/postgres", connectionTimeoutMillis: 500 });
    expect(await databaseUp(pool)).toBe(false);
    await pool.end();
  });

  it("is false when the server accepts the connection and never answers", async () => {
    // A real socket that listens and stays silent: the connect works, `select 1` never returns.
    const sockets = new Set<Socket>();
    const silent = createServer((s) => sockets.add(s)).listen(0, "127.0.0.1");
    await new Promise((ok) => silent.once("listening", ok));
    const { port } = silent.address() as { port: number };
    const pool = new pg.Pool({ connectionString: `postgres://postgres:x@127.0.0.1:${port}/postgres` });
    const started = Date.now();
    expect(await databaseUp(pool, 300)).toBe(false);
    expect(Date.now() - started).toBeLessThan(2000);
    for (const s of sockets) s.destroy();
    silent.close();
    // Cleanup only: log a failure instead of hiding it.
    pool.end().catch((e: Error) => console.error("pool cleanup:", e.message));
  });
});
