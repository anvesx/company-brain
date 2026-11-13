import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { httpExchange, refreshOne } from "../../../src/index.js";
import { database, skip } from "../../support/db.js";
import { tokenServer } from "../../support/token-server.js";

let db: Awaited<ReturnType<typeof database>>;
beforeAll(async () => {
  if (!skip) db = await database();
});
afterAll(async () => {
  if (!skip) await db.close();
});
const put = (id: string, refreshToken: string | null = "R0") =>
  db.vault.put("t1", { id, owner: "u", provider: "google", token: { accessToken: "A0", ...(refreshToken ? { refreshToken } : {}) } });
const fast = { backoffMs: 1 };
const ok = { status: 200, body: { access_token: "A1", refresh_token: "R1", expires_in: 3600 } };

describe.skipIf(skip)("refresh against a real token endpoint", () => {
  test("rotates both tokens, sets the expiry, clears the lease", async () => {
    const s = await tokenServer([ok]);
    await put("f1");
    expect(await refreshOne(db.vault, "t1", "f1", httpExchange(s.url, "c", "s"), fast)).toBe("refreshed");
    const got = await db.vault.get("t1", "f1");
    expect(got?.token).toEqual({ accessToken: "A1", refreshToken: "R1" });
    expect(got?.expiresAt && got.expiresAt.getTime() > Date.now() + 3_000_000).toBe(true);
    expect((await db.owner.query("SELECT lease_until FROM connector_tokens WHERE id='f1'")).rows[0].lease_until).toBeNull();
    await s.close();
  });
  test("a provider that returns no new refresh token keeps the old one", async () => {
    const s = await tokenServer([{ status: 200, body: { access_token: "A2" } }]);
    await put("f2");
    await refreshOne(db.vault, "t1", "f2", httpExchange(s.url, "c", "s"), fast);
    expect((await db.vault.get("t1", "f2"))?.token).toEqual({ accessToken: "A2", refreshToken: "R0" });
    await s.close();
  });
  test.each([
    [400, "invalid_grant"],
    [401, "invalid_client"],
  ])("%i %s is a genuine auth error: needs-auth, credential kept, one call", async (status, error) => {
    const s = await tokenServer([{ status, body: { error } }]);
    await put(`auth${status}`);
    expect(await refreshOne(db.vault, "t1", `auth${status}`, httpExchange(s.url, "c", "s"), fast)).toBe("needs-auth");
    expect(s.seen).toHaveLength(1);
    const got = await db.vault.get("t1", `auth${status}`);
    expect([got?.status, got?.token.refreshToken]).toEqual(["needs-auth", "R0"]);
    expect(await refreshOne(db.vault, "t1", `auth${status}`, httpExchange(s.url, "c", "s"), fast)).toBe("needs-auth");
    expect(s.seen).toHaveLength(1);
    await s.close();
  });
  test("5xx twice then success: retried, refreshed, never needs-auth", async () => {
    const s = await tokenServer([{ status: 503, body: {} }, { status: 500, body: {} }, ok]);
    await put("r1");
    expect(await refreshOne(db.vault, "t1", "r1", httpExchange(s.url, "c", "s"), fast)).toBe("refreshed");
    expect(s.seen).toEqual(["R0", "R0", "R0"]);
    await s.close();
  });
  test.each([
    [503, {}],
    [429, {}],
    [400, { error: "temporarily_unavailable" }],
    [200, {}],
  ])("%i stays active: retry-later after all attempts", async (status, body) => {
    const s = await tokenServer([{ status, body }]);
    await put(`t${status}${Object.keys(body).length}`);
    expect(await refreshOne(db.vault, "t1", `t${status}${Object.keys(body).length}`, httpExchange(s.url, "c", "s"), fast)).toBe("retry-later");
    expect(s.seen).toHaveLength(3);
    expect((await db.vault.get("t1", `t${status}${Object.keys(body).length}`))?.status).toBe("active");
    await s.close();
  });
});
