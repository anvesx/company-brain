import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createVault, dueRows, loadKeyring, rotate } from "../../../src/index.js";
import { database, hex, skip } from "../../support/db.js";

let db: Awaited<ReturnType<typeof database>>;
beforeAll(async () => {
  if (!skip) db = await database();
});
afterAll(async () => {
  if (!skip) await db.close();
});
const row = (id: string) => ({ id, owner: "u", provider: "p", token: { accessToken: "t" } });

describe.skipIf(skip)("put id validation", () => {
  test.each([[""], ["a".repeat(129)], ["a b"], ["a'b"], ["a/b"], ["é"]])("rejects %j", async (id) => {
    await expect(db.vault.put("t1", row(id))).rejects.toMatchObject({ code: "BAD_ID" });
  });
  test("accepts the safe charset up to 128 chars", async () => {
    await db.vault.put("t1", row(`${"a".repeat(100)}A_9:.-`));
    await db.vault.put("t1", row("a".repeat(128)));
    expect((await db.vault.list("t1")).length).toBe(2);
  });
});

describe.skipIf(skip)("sweeper audit", () => {
  test("fires for every cross-tenant call, never for a tenant call", async () => {
    const events: unknown[] = [];
    const v = createVault(db.pool, loadKeyring(`k1:${hex()}`), { audit: (e) => events.push(e) });
    await v.put("t1", row("au1"));
    await v.list("t1");
    expect(events.length).toBe(0);
    await v.countIds(["au1"]);
    await dueRows(v, 1000, 10);
    await rotate(v);
    expect(events.length).toBe(4);
    expect(events[0]).toMatchObject({ scope: "sweeper" });
  });
});
