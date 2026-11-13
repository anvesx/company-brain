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

describe.skipIf(skip)("refresh edge cases", () => {
  test("an unreachable endpoint is transient too", async () => {
    const s = await tokenServer([ok]);
    await s.close();
    await put("down");
    expect(await refreshOne(db.vault, "t1", "down", httpExchange(s.url, "c", "s"), fast)).toBe("retry-later");
    expect((await db.vault.get("t1", "down"))?.status).toBe("active");
  });
  test("missing row, no refresh token, and re-consent resets needs-auth", async () => {
    const s = await tokenServer([ok]);
    const ex = httpExchange(s.url, "c", "s");
    expect(await refreshOne(db.vault, "t1", "ghost", ex, fast)).toBe("missing");
    await put("nr", null);
    expect(await refreshOne(db.vault, "t1", "nr", ex, fast)).toBe("unsupported");
    await db.owner.query("UPDATE connector_tokens SET status='needs-auth' WHERE id='nr'");
    await put("nr");
    expect(await refreshOne(db.vault, "t1", "nr", ex, fast)).toBe("refreshed");
    await s.close();
  });
  test("the default wait between retries is real time", async () => {
    const s = await tokenServer([{ status: 503, body: {} }, ok]);
    await put("slow");
    const t = Date.now();
    expect(await refreshOne(db.vault, "t1", "slow", httpExchange(s.url, "c", "s"), { backoffMs: 40 })).toBe("refreshed");
    expect(Date.now() - t).toBeGreaterThanOrEqual(35);
    await s.close();
  });
});
