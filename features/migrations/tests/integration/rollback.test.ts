import { afterEach, describe, expect, test } from "vitest";
import { migrate } from "../../src/index.js";
import { database, skip } from "./support/database.js";
import { migrateDown, migrateOnlyTo } from "./support/migrator.js";
import { tableCount, versions } from "./support/shapes.js";

const closes: Array<() => Promise<void>> = [];
afterEach(async () => {
  await Promise.all(closes.splice(0).map((close) => close()));
});

async function setup() {
  const db = await database();
  closes.push(db.close);
  return db.pool;
}

describe.skipIf(skip)("rollback and partial upgrade", () => {
  test("migrateDown then re-up works", async () => {
    const pool = await setup();
    await migrate(pool);
    await migrateDown(pool);
    expect(await versions(pool)).toEqual(["001_core"]);
    await migrate(pool);
    expect(await versions(pool)).toEqual(["001_core", "002_discovery"]);
    expect(await tableCount(pool)).toBe("14");
  });

  test("upgrade from 001-only to 002 adds discovery tables", async () => {
    const pool = await setup();
    await migrateOnlyTo(pool, "001_core");
    expect(await versions(pool)).toEqual(["001_core"]);
    const before = await tableCount(pool);
    await migrate(pool);
    expect(await versions(pool)).toEqual(["001_core", "002_discovery"]);
    expect(Number(await tableCount(pool))).toBeGreaterThan(Number(before));
    expect(await tableCount(pool)).toBe("14");
  });
});
