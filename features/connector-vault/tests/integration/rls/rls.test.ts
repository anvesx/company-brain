import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { database, skip } from "../../support/db.js";

let db: Awaited<ReturnType<typeof database>>;
beforeAll(async () => {
  if (skip) return;
  db = await database();
  await db.vault.put("t1", { id: "x1", owner: "u", provider: "github", token: { accessToken: "T1-SECRET" } });
  await db.vault.put("t2", { id: "x2", owner: "u", provider: "github", token: { accessToken: "T2-SECRET" } });
});
afterAll(async () => {
  if (!skip) await db.close();
});

describe.skipIf(skip)("per-tenant row-level security", () => {
  test("a wrong-tenant session reads zero rows", async () => {
    expect(await db.vault.get("t2", "x1")).toBeUndefined();
    expect((await db.vault.list("t2")).map((m) => m.id)).toEqual(["x2"]);
  });
  test("raw SQL with no tenant set sees nothing, even without a WHERE", async () => {
    expect((await db.pool.query("SELECT * FROM connector_tokens")).rowCount).toBe(0);
  });
  test("a tenant cannot overwrite or delete another tenant's row", async () => {
    await expect(db.vault.put("t2", { id: "x1", owner: "u", provider: "github", token: { accessToken: "evil" } })).rejects.toThrow();
    expect(await db.vault.remove("t2", "x1")).toBe(false);
    expect((await db.vault.get("t1", "x1"))?.token.accessToken).toBe("T1-SECRET");
  });
  test("a tenant cannot insert a row labelled with another tenant", async () => {
    const c = await db.pool.connect();
    try {
      await c.query("BEGIN");
      await c.query("SELECT set_config('app.tenant','t2',true)");
      await expect(c.query("INSERT INTO connector_tokens (id,tenant,owner,provider,kid,sealed) VALUES ('y','t1','u','p','k1','z')")).rejects.toThrow(
        /row-level security/,
      );
    } finally {
      await c.query("ROLLBACK");
      c.release();
    }
  });
  test("the due scan uses the partial index on 20k rows", async () => {
    await db.owner.query(
      "INSERT INTO connector_tokens (id,tenant,owner,provider,kid,sealed,expires_at) SELECT 'bulk'||g,'t9','u','p','k1','z', now() + g * interval '1 second' FROM generate_series(1,20000) g",
    );
    await db.owner.query("ANALYZE connector_tokens");
    const plan = await db.owner.query(
      "EXPLAIN SELECT id FROM connector_tokens WHERE status='active' AND expires_at <= now() + interval '10 minutes' ORDER BY expires_at, id LIMIT 200",
    );
    expect(plan.rows.map((r) => r["QUERY PLAN"]).join("\n")).toContain("connector_tokens_due");
  });
});
