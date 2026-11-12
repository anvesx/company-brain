import type pg from "pg";
import { afterEach, describe, expect, test } from "vitest";
import { type MigrationError, migrate } from "../../src/index.js";
import { MIGRATE_LOCK_KEY } from "../../src/runner.js";
import { database, skip } from "./support/database.js";

const closes: Array<() => Promise<void>> = [];
afterEach(async () => {
  await Promise.all(closes.splice(0).map((close) => close()));
});

const tamper = "UPDATE schema_version SET checksum = repeat('0', 64) WHERE version = '001_core'";

describe.skipIf(skip)("checksum verification", () => {
  test("rejects an edited applied migration checksum", async () => {
    const db = await database();
    closes.push(db.close);
    await migrate(db.pool);
    await db.pool.query(tamper);
    await expect(migrate(db.pool)).rejects.toMatchObject<Partial<MigrationError>>({ code: "CHECKSUM_MISMATCH" });
  });

  test("verifies inside the migration lock: a concurrent edit is seen, not raced", async () => {
    const db = await database(2);
    closes.push(db.close);
    await migrate(db.pools[0] as pg.Pool);
    const holder = await (db.pools[1] as pg.Pool).connect();
    await holder.query("BEGIN");
    await holder.query(`SELECT pg_advisory_xact_lock(${MIGRATE_LOCK_KEY})`);
    const racing = (async () => {
      try {
        await migrate(db.pool);
        return "resolved";
      } catch (error) {
        return (error as MigrationError).code;
      }
    })();
    const early = await Promise.race([racing, new Promise((resolve) => setTimeout(() => resolve("blocked"), 500))]);
    expect(early).toBe("blocked");
    await holder.query(tamper);
    await holder.query("COMMIT");
    holder.release();
    expect(await racing).toBe("CHECKSUM_MISMATCH");
  });
});
