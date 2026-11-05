import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DAY, one, shiftTime, toMs } from "../../support/db.js";
import { json, signUp } from "../../support/http.js";
import { boot, type Env } from "../../support/server.js";

let env: Env;
beforeEach(async () => {
  env = await boot();
});
afterEach(() => env.close());

const session = (userId: string) => one(env.db, "select id, expiresAt from session where userId = ?", userId);

describe("session refresh on use", () => {
  it("rule 2: a session used two days after sign-in is pushed back out to 7 days", async () => {
    const ada = await signUp(env, "Ada");
    const { id } = session(ada.userId);
    shiftTime(env.db, "session", "expiresAt", String(id), -2 * DAY);
    shiftTime(env.db, "session", "updatedAt", String(id), -2 * DAY);
    const res = await ada.browser.call("/api/auth/get-session");
    expect(res.status).toBe(200);
    expect(await json(res)).toMatchObject({ user: { id: ada.userId } });
    expect(Math.abs(toMs(session(ada.userId)["expiresAt"]) - (Date.now() + 7 * DAY))).toBeLessThan(60_000);
  });

  it("rule 2: an expired session is no session", async () => {
    const ada = await signUp(env, "Ada");
    shiftTime(env.db, "session", "expiresAt", String(session(ada.userId)["id"]), -8 * DAY);
    expect(await env.identity.port.fromSession(ada.browser.headers())).toBeNull();
  });
});
