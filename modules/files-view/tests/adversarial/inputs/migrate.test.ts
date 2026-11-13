import { createPostgresGraphStore } from "@anvesx/graph-store";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startPostgres, type Throwaway } from "../../../../../features/graph-store/tests/support/pg/server.js";
import { migrate } from "../../../src/db/migrate.js";

let db: Throwaway;
let pool: pg.Pool;
beforeAll(async () => {
  db = await startPostgres();
  pool = new pg.Pool({ connectionString: db.url, max: 4 });
  pool.on("error", () => undefined);
  await createPostgresGraphStore({ pool });
});
afterAll(async () => {
  await pool.end();
  db.stop();
});
const within = <T>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<"HUNG">((ok) => setTimeout(() => ok("HUNG"), ms))]);

describe("migrate", () => {
  it("is idempotent and safe to run in parallel", async () => {
    await Promise.all([migrate(pool), migrate(pool), migrate(pool)]);
    await migrate(pool);
    const r = await pool.query("SELECT count(*)::int AS n FROM pg_indexes WHERE indexname LIKE 'fv_%'");
    expect(r.rows[0].n).toBeGreaterThanOrEqual(9);
  });
  it("a failed migrate must not leave the advisory lock held on a pooled connection", async () => {
    await pool.query("DROP FUNCTION IF EXISTS fv_num(text, text) CASCADE");
    await pool.query("DROP FUNCTION IF EXISTS fv_prop(text, text) CASCADE");
    await pool.query("CREATE FUNCTION fv_prop(p text, k text) RETURNS int LANGUAGE sql IMMUTABLE AS $$ SELECT 1 $$");
    await expect(migrate(pool)).rejects.toBeTruthy(); // return type clash makes CREATE OR REPLACE fail
    await pool.query("DROP FUNCTION fv_prop(text, text)");
    // The leaked session lock (taken with pg_advisory_lock, never unlocked on error) blocks every later migrate on another connection.
    const held = (await pool.query("SELECT count(*)::int AS n FROM pg_locks WHERE locktype = 'advisory' AND granted")).rows[0].n;
    expect(held, "advisory lock leaked on an idle pooled connection").toBe(0);
    const again = await within(Promise.all([migrate(pool), migrate(pool)]), 8_000);
    expect(again).not.toBe("HUNG");
  });
});
