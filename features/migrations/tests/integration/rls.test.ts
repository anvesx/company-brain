import { afterEach, describe, expect, test } from "vitest";
import { migrate } from "../../src/index.js";
import { database, skip } from "./support/database.js";

const closes: Array<() => Promise<void>> = [];
afterEach(async () => {
  await Promise.all(closes.splice(0).map((close) => close()));
});

const insert = (id: string, tenant: string) =>
  `INSERT INTO connection (id, tenant, owner, provider, scopes, status, zone, health)
   VALUES ('00000000-0000-0000-0000-00000000000${id}', '${tenant}', 'owner', 'drive', '{}', 'active', 'internal', 'ok')`;

async function tenantSession() {
  const db = await database();
  closes.push(db.close);
  await migrate(db.pool);
  await db.useTenantRole();
  await db.pool.query("SET app.current_tenant = 'tenant-a'");
  return db.pool;
}

describe.skipIf(skip)("tenant row-level security", () => {
  test("wrong tenant reads zero rows", async () => {
    const pool = await tenantSession();
    await pool.query(insert("1", "tenant-a"));
    await pool.query("SET app.current_tenant = 'tenant-b'");
    expect((await pool.query("SELECT id FROM connection")).rows).toEqual([]);
  });

  test("cross-tenant WRITE blocked by RLS WITH CHECK", async () => {
    const pool = await tenantSession();
    await pool.query(insert("1", "tenant-a"));
    await expect(pool.query(insert("2", "tenant-b"))).rejects.toThrow(/row-level security/);
  });
});
