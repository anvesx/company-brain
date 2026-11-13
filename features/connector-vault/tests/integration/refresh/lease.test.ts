import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { httpExchange, refreshOne, takeLease } from "../../../src/index.js";
import { database, skip } from "../../support/db.js";
import { tokenServer } from "../../support/token-server.js";

let db: Awaited<ReturnType<typeof database>>;
beforeAll(async () => {
  if (skip) return;
  db = await database();
  await db.vault.put("t1", { id: "l1", owner: "u", provider: "google", token: { accessToken: "A0", refreshToken: "R0" } });
});
afterAll(async () => {
  if (!skip) await db.close();
});

describe.skipIf(skip)("refresh lease", () => {
  test("five replicas at once spend the refresh token once", async () => {
    const s = await tokenServer([{ status: 200, body: { access_token: "A1", refresh_token: "R1" } }], 150);
    const ex = httpExchange(s.url, "c", "s");
    const out = await Promise.all([1, 2, 3, 4, 5].map(() => refreshOne(db.vault, "t1", "l1", ex)));
    expect(out.filter((o) => o === "refreshed")).toHaveLength(1);
    expect(out.filter((o) => o === "busy")).toHaveLength(4);
    expect(s.seen).toEqual(["R0"]);
    await s.close();
  });
  test("a held lease blocks others until it expires (crashed replica recovers)", async () => {
    expect(await takeLease(db.pool, "t1", "l1", 200)).toBe(true);
    expect(await takeLease(db.pool, "t1", "l1", 200)).toBe(false);
    await new Promise((r) => setTimeout(r, 300));
    expect(await takeLease(db.pool, "t1", "l1", 200)).toBe(true);
  });
  test("a lease is tenant-scoped: another tenant cannot take it", async () => {
    expect(await takeLease(db.pool, "t2", "l1", 200)).toBe(false);
  });
});
