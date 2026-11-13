import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { database, skip } from "../../support/db.js";

let db: Awaited<ReturnType<typeof database>>;
beforeAll(async () => {
  if (!skip) db = await database();
});
afterAll(async () => {
  if (!skip) await db.close();
});
const row = (id: string, token = `tok-${id}`) => ({ id, owner: "u1", provider: "github", token: { accessToken: token, refreshToken: `r-${id}` } });

describe.skipIf(skip)("vault store on Postgres 16", () => {
  test("put then get returns the token; the column holds only ciphertext", async () => {
    await db.vault.put("t1", row("a1", "PLAINTEXT-ONE"));
    expect((await db.vault.get("t1", "a1"))?.token.accessToken).toBe("PLAINTEXT-ONE");
    const raw = await db.owner.query("SELECT sealed, kid FROM connector_tokens WHERE id = 'a1'");
    expect(raw.rows[0].sealed).not.toContain("PLAINTEXT-ONE");
    expect(raw.rows[0].kid).toBe("k1");
  });
  test("put again replaces the token and resets status", async () => {
    await db.vault.put("t1", row("a2", "old"));
    await db.owner.query("UPDATE connector_tokens SET status = 'needs-auth' WHERE id = 'a2'");
    await db.vault.put("t1", row("a2", "new"));
    const got = await db.vault.get("t1", "a2");
    expect([got?.token.accessToken, got?.status]).toEqual(["new", "active"]);
  });
  test("list returns metadata only", async () => {
    const list = await db.vault.list("t1");
    expect(list.map((m) => m.id)).toEqual(expect.arrayContaining(["a1", "a2"]));
    expect(JSON.stringify(list)).not.toContain("PLAINTEXT-ONE");
  });
  test("get of a missing id is undefined", async () => {
    expect(await db.vault.get("t1", "nope")).toBeUndefined();
  });
  test("a sealed value copied onto another row fails to open (row id is AAD)", async () => {
    await db.vault.put("t1", row("b1", "victim"));
    await db.vault.put("t1", row("b2", "other"));
    await db.owner.query("UPDATE connector_tokens SET sealed = (SELECT sealed FROM connector_tokens WHERE id='b1') WHERE id='b2'");
    await expect(db.vault.get("t1", "b2")).rejects.toMatchObject({ code: "UNSEALABLE" });
  });
});
