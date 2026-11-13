import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { rotate } from "../../../src/index.js";
import { database, hex, skip } from "../../support/db.js";

const OLD = `old:${hex()}`;
const NEW = `new:${hex()}`;
let db: Awaited<ReturnType<typeof database>>;
beforeAll(async () => {
  if (skip) return;
  db = await database(OLD);
  for (let i = 0; i < 25; i++)
    await db.vault.put(`t${i % 3}`, { id: `r${String(i).padStart(2, "0")}`, owner: "u", provider: "github", token: { accessToken: `tok${i}` } });
});
afterAll(async () => {
  if (!skip) await db.close();
});

describe.skipIf(skip)("key rotation", () => {
  test("rows stay readable while the new key is first and the old one still listed", async () => {
    const mixed = db.withKeys(`${NEW},${OLD}`);
    expect((await mixed.get("t0", "r00"))?.token.accessToken).toBe("tok0");
    await mixed.put("t1", { id: "fresh", owner: "u", provider: "github", token: { accessToken: "f" } });
    expect((await db.owner.query("SELECT kid FROM connector_tokens WHERE id='fresh'")).rows[0].kid).toBe("new");
  });
  test("rotate re-seals every row in small batches, then the old key is rejected", async () => {
    const mixed = db.withKeys(`${NEW},${OLD}`);
    expect(await rotate(mixed, 4)).toEqual({ rotated: 25, remaining: 0 });
    expect(await rotate(mixed, 4)).toEqual({ rotated: 0, remaining: 0 });
    const only = db.withKeys(NEW);
    for (let i = 0; i < 25; i++) expect((await only.get(`t${i % 3}`, `r${String(i).padStart(2, "0")}`))?.token.accessToken).toBe(`tok${i}`);
    await expect(db.vault.get("t0", "r00")).rejects.toMatchObject({ code: "UNSEALABLE" });
  });
});
