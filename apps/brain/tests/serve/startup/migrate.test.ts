import { PostgresDialect } from "kysely";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startPostgres, type Throwaway } from "../../../../../features/graph-store/tests/support/pg/server.js";
import { migrateLocked } from "../../../src/serve/startup.js";
import { freshDb } from "../boot.js";

// Real Postgres. The lock connection comes from `pool`; the migration itself runs on the dialect's pool, so a
// migration that cannot reach its database fails while the lock connection is healthy, and the test can look
// at what migrateLocked did with that connection afterwards.
const secret = "0123456789abcdef0123456789abcdef";
const config = (pool: pg.Pool) => ({
  baseUrl: "http://localhost",
  secret,
  resource: "http://localhost/mcp",
  database: { dialect: new PostgresDialect({ pool }), type: "postgres" as const },
});
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("migrateLocked", () => {
  let db: Throwaway | undefined;
  let url = "";
  beforeAll(async () => {
    db = await startPostgres().catch((e) => (process.env["CI"] === "true" ? Promise.reject(e) : undefined));
    if (db) url = await freshDb(db);
  }, 90_000);
  afterAll(() => db?.stop());

  it("hands the lock connection back to the pool after a successful migration", async (ctx) => {
    if (!db) return ctx.skip();
    const pool = new pg.Pool({ connectionString: url });
    try {
      await migrateLocked(pool, config(pool));
      // Two clients: the lock holder and the one kysely checks out to run the migrations. Both must be back.
      expect({ total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount }).toEqual({ total: 2, idle: 2, waiting: 0 });
      await migrateLocked(pool, config(pool)); // a second run finds every table in place and still releases
      expect(pool.idleCount).toBe(pool.totalCount);
    } finally {
      await pool.end();
    }
  });

  it("throws the lock connection away after a failed migration, so the pool never reuses an open transaction", async (ctx) => {
    if (!db) return ctx.skip();
    const pool = new pg.Pool({ connectionString: url });
    const dead = new pg.Pool({ connectionString: "postgres://postgres:x@127.0.0.1:1/postgres", connectionTimeoutMillis: 1000 });
    try {
      await expect(migrateLocked(pool, config(dead))).rejects.toThrow();
      expect({ total: pool.totalCount, idle: pool.idleCount }).toEqual({ total: 0, idle: 0 });
    } finally {
      await pool.end();
      await dead.end();
    }
  });

  it("waits for another holder of advisory lock 7410002 inside its transaction", async (ctx) => {
    if (!db) return ctx.skip();
    const holder = new pg.Client({ connectionString: url });
    await holder.connect();
    await holder.query("BEGIN");
    await holder.query("SELECT pg_advisory_xact_lock(7410002)");
    const pool = new pg.Pool({ connectionString: url });
    try {
      let done = false;
      const run = migrateLocked(pool, config(pool)).then(() => (done = true));
      await sleep(400);
      expect(done).toBe(false); // still waiting on the lock
      await holder.query("COMMIT"); // releases the lock
      await run;
      expect(done).toBe(true);
    } finally {
      await pool.end();
      await holder.end();
    }
  });
});
