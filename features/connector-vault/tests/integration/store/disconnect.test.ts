import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { database, skip } from "../../support/db.js";

let db: Awaited<ReturnType<typeof database>>;
beforeAll(async () => {
  if (skip) return;
  db = await database();
  await db.owner.query("CREATE TABLE history (id text)");
  await db.owner.query("GRANT ALL ON history TO PUBLIC");
});
afterAll(async () => {
  if (!skip) await db.close();
});
const put = (id: string) => db.vault.put("t1", { id, owner: "u", provider: "github", token: { accessToken: "T" } });

describe.skipIf(skip)("disconnect", () => {
  test("remove deletes the ciphertext row", async () => {
    await put("d1");
    expect(await db.vault.remove("t1", "d1")).toBe(true);
    expect((await db.owner.query("SELECT 1 FROM connector_tokens WHERE id='d1'")).rowCount).toBe(0);
    expect(await db.vault.remove("t1", "d1")).toBe(false);
  });
  test("the delete and the caller's own writes commit together", async () => {
    await put("d2");
    await db.vault.remove("t1", "d2", async (c) => void (await c.query("INSERT INTO history VALUES ('d2')")));
    expect((await db.owner.query("SELECT 1 FROM history WHERE id='d2'")).rowCount).toBe(1);
    expect((await db.owner.query("SELECT 1 FROM connector_tokens WHERE id='d2'")).rowCount).toBe(0);
  });
  test("if the caller's write fails, the token row stays", async () => {
    await put("d3");
    await expect(db.vault.remove("t1", "d3", async (c) => void (await c.query("INSERT INTO no_such_table VALUES (1)")))).rejects.toThrow();
    expect((await db.owner.query("SELECT 1 FROM connector_tokens WHERE id='d3'")).rowCount).toBe(1);
  });
});
