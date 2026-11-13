import { afterEach, describe, expect, test } from "vitest";
import { migrate } from "../../src/index.js";
import { database, skip } from "./support/database.js";
import { graphStoreShape, tableCount, versions } from "./support/shapes.js";

const closes: Array<() => Promise<void>> = [];
afterEach(async () => {
  await Promise.all(closes.splice(0).map((close) => close()));
});

async function setup(count = 1) {
  const db = await database(count);
  closes.push(db.close);
  return db;
}

describe.skipIf(skip)("migrate lifecycle", () => {
  test("migrates an empty database and records checksums", async () => {
    const { pool } = await setup();
    await migrate(pool);
    const rows = (await pool.query("SELECT version, checksum FROM schema_version")).rows;
    expect(await tableCount(pool)).toBe("14");
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => /^[a-f0-9]{64}$/.test(row.checksum))).toBe(true);
  });

  test("preserves today's graph-store schema", async () => {
    const { pool } = await setup();
    await graphStoreShape(pool);
    await migrate(pool);
    expect((await pool.query("SELECT id FROM nodes")).rows).toEqual([{ id: "node:1" }]);
  });

  test("idempotent: three migrate() calls leave 2 schema_version rows", async () => {
    const { pool } = await setup();
    await migrate(pool);
    await migrate(pool);
    await migrate(pool);
    expect(await versions(pool)).toEqual(["001_core", "002_discovery"]);
  });

  test("4 concurrent migrate() pools on a fresh schema succeed", async () => {
    const { pools } = await setup(4);
    const results = await Promise.allSettled(pools.map((pool) => migrate(pool)));
    expect(results.map((r) => r.status)).toEqual(["fulfilled", "fulfilled", "fulfilled", "fulfilled"]);
    expect(await tableCount(pools[0] as (typeof pools)[number])).toBe("14");
    expect(await versions(pools[0] as (typeof pools)[number])).toHaveLength(2);
  });
});
