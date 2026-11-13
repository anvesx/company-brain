import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { importRecords } from "../../../src/index.js";
import { database, skip } from "../../support/db.js";

let db: Awaited<ReturnType<typeof database>>;
beforeAll(async () => {
  if (!skip) db = await database();
});
afterAll(async () => {
  if (!skip) await db.close();
});
const recs = ["m1", "m2", "m3"].map((id, i) => ({ id, tenant: `t${i % 2}`, owner: "u", provider: "github", token: { accessToken: `tok-${id}` } }));

describe.skipIf(skip)("import from the old stack", () => {
  test("dry run reports and writes nothing", async () => {
    expect(await importRecords(db.vault, recs, true)).toEqual({ seen: 3, alreadyThere: 0, written: 3, dryRun: true });
    expect(await db.vault.countIds(["m1", "m2", "m3"])).toBe(0);
  });
  test("real run writes every row and the count check passes", async () => {
    expect(await importRecords(db.vault, recs)).toEqual({ seen: 3, alreadyThere: 0, written: 3, dryRun: false });
    expect((await db.vault.get("t1", "m2"))?.token.accessToken).toBe("tok-m2");
  });
  test("repeating is safe: existing rows are left alone", async () => {
    expect(await importRecords(db.vault, recs)).toMatchObject({ alreadyThere: 3, written: 0 });
    expect(await importRecords(db.vault, recs, true)).toMatchObject({ written: 0 });
  });
  test("a count mismatch throws (a trigger drops the row after insert, as a broken replica would)", async () => {
    await db.owner.query(
      `CREATE FUNCTION drop_z() RETURNS trigger AS $$ BEGIN DELETE FROM connector_tokens WHERE id = NEW.id; RETURN NULL; END $$ LANGUAGE plpgsql SECURITY DEFINER`,
    );
    await db.owner.query(
      "CREATE CONSTRAINT TRIGGER lose_z AFTER INSERT ON connector_tokens DEFERRABLE INITIALLY DEFERRED FOR EACH ROW WHEN (NEW.id = 'z9') EXECUTE FUNCTION drop_z()",
    );
    await expect(importRecords(db.vault, [{ id: "z9", tenant: "t1", owner: "u", provider: "p", token: { accessToken: "x" } }])).rejects.toMatchObject({
      code: "COUNT_MISMATCH",
    });
  });
});
