import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { dueRows, httpExchange, sweep } from "../../../src/index.js";
import { database, skip } from "../../support/db.js";
import { tokenServer } from "../../support/token-server.js";

let db: Awaited<ReturnType<typeof database>>;
const soon = new Date(Date.now() + 60_000);
const later = new Date(Date.now() + 86_400_000);
beforeAll(async () => {
  if (skip) return;
  db = await database();
  for (let i = 0; i < 7; i++)
    await db.vault.put(`t${i % 2}`, { id: `due${i}`, owner: "u", provider: "google", token: { accessToken: "A", refreshToken: "R" }, expiresAt: soon });
  await db.vault.put("t0", { id: "far", owner: "u", provider: "google", token: { accessToken: "A", refreshToken: "R" }, expiresAt: later });
  await db.vault.put("t0", { id: "other", owner: "u", provider: "nope", token: { accessToken: "A", refreshToken: "R" }, expiresAt: soon });
});
afterAll(async () => {
  if (!skip) await db.close();
});

describe.skipIf(skip)("sweep", () => {
  test("pages through due rows across tenants by keyset", async () => {
    const first = await dueRows(db.vault, 600_000, 3);
    const next = await dueRows(db.vault, 600_000, 3, first.at(-1));
    expect(first).toHaveLength(3);
    expect(new Set([...first, ...next].map((r) => r.id)).size).toBe(6);
    expect((await dueRows(db.vault, 600_000, 50)).map((r) => r.id)).not.toContain("far");
  });
  test("refreshes everything due, leaves the rest, counts providers it cannot refresh", async () => {
    const s = await tokenServer([{ status: 200, body: { access_token: "A9", refresh_token: "R9", expires_in: 3600 } }]);
    const ex = httpExchange(s.url, "c", "s");
    const out = await sweep(db.vault, (p) => (p === "google" ? ex : undefined), 600_000, {}, 2);
    expect(out.refreshed).toBe(7);
    expect(out.unsupported).toBe(1);
    expect(s.seen).toHaveLength(7);
    expect((await db.vault.get("t0", "far"))?.token.accessToken).toBe("A");
    expect((await db.vault.get("t1", "due1"))?.token.accessToken).toBe("A9");
    await s.close();
  });
});
