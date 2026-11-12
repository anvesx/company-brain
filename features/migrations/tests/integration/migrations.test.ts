import { afterEach, describe, expect, test } from "vitest";
import { type MigrationError, migrate } from "../../src/index.js";
import { database, graphStoreShape } from "./support.js";

const closes: Array<() => Promise<void>> = [];
afterEach(async () => {
  await Promise.all(closes.splice(0).map((close) => close()));
});

async function setup() {
  const db = await database();
  closes.push(db.close);
  return db;
}

describe("Postgres migrations", () => {
  test("migrates an empty database and records checksums", async () => {
    const { pool } = await setup();
    await migrate(pool);
    const tables = await pool.query<{ count: string }>(
      "SELECT count(*) FROM information_schema.tables WHERE table_schema = current_schema() AND table_name NOT LIKE 'kysely_%'",
    );
    const versions = await pool.query("SELECT version, checksum FROM schema_version ORDER BY version");
    expect(tables.rows[0]?.count).toBe("14");
    expect(versions.rows).toHaveLength(2);
    expect(versions.rows.every((row) => /^[a-f0-9]{64}$/.test(row.checksum))).toBe(true);
  });

  test("preserves today's graph-store schema", async () => {
    const { pool } = await setup();
    await graphStoreShape(pool);
    await migrate(pool);
    expect((await pool.query("SELECT id FROM nodes")).rows).toEqual([{ id: "node:1" }]);
  });

  test("wrong tenant reads zero rows", async () => {
    const { pool, useTenantRole } = await setup();
    await migrate(pool);
    await useTenantRole();
    await pool.query("SET app.current_tenant = 'tenant-a'");
    await pool.query(
      "INSERT INTO connection (id, tenant, owner, provider, scopes, status, zone, health) VALUES ('00000000-0000-0000-0000-000000000001', 'tenant-a', 'owner', 'drive', '{}', 'active', 'internal', 'ok')",
    );
    await pool.query("SET app.current_tenant = 'tenant-b'");
    expect((await pool.query("SELECT id FROM connection")).rows).toEqual([]);
  });

  test("rejects an edited applied migration checksum", async () => {
    const { pool } = await setup();
    await migrate(pool);
    await pool.query("UPDATE schema_version SET checksum = repeat('0', 64) WHERE version = '001_core'");
    await expect(migrate(pool)).rejects.toMatchObject<Partial<MigrationError>>({ code: "CHECKSUM_MISMATCH" });
  });
});
