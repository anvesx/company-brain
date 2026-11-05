import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createIdentity } from "../../../src/index.js";
import { openDb } from "../../support/db.js";
import { Browser, PASSWORD, signIn, signUp } from "../../support/http.js";
import { boot, type Env, SECRET } from "../../support/server.js";

let env: Env;
beforeEach(async () => {
  env = await boot();
});
afterEach(() => env.close());

const sessionCookie = (res: Response): string => {
  const line = res.headers.getSetCookie().find((c) => /session_token=/.test(c));
  if (!line) throw new Error("no session cookie set");
  return line;
};

describe("session cookie", () => {
  it("rule 2: sign-in sets HttpOnly, SameSite Lax and a 7 day Max-Age", async () => {
    const ada = await signUp(env, "Ada");
    const res = await signIn(new Browser(env.base), ada.email, PASSWORD);
    expect(res.status).toBe(200);
    const cookie = sessionCookie(res);
    expect(cookie).toMatch(/;\s*HttpOnly/i);
    expect(cookie).toMatch(/;\s*SameSite=Lax/i);
    expect(cookie).toMatch(/;\s*Max-Age=604800\b/i);
  });

  it("rule 2: on localhost the cookie is not Secure, so the browser keeps it over http", async () => {
    const ada = await signUp(env, "Ada");
    expect(sessionCookie(await signIn(new Browser(env.base), ada.email, PASSWORD))).not.toMatch(/;\s*Secure/i);
  });

  it("rule 2: outside localhost the cookie is Secure", async () => {
    const base = "https://brain.example.com";
    const identity = createIdentity({ baseUrl: base, secret: SECRET, database: openDb(), resource: `${base}/mcp` });
    await identity.migrate();
    const body = JSON.stringify({ name: "Ada", email: "ada@example.com", password: PASSWORD });
    const res = await identity.routes.request(`${base}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: base },
      body,
    });
    expect(res.status).toBe(200);
    expect(sessionCookie(res)).toMatch(/;\s*Secure/i);
  });

  it("rule 2: the session row lives 7 days from sign-in", async () => {
    const ada = await signUp(env, "Ada");
    const caller = await env.identity.port.fromSession(ada.browser.headers());
    expect(caller?.user).toBe(ada.userId);
    const row = env.db.prepare("select expiresAt from session where userId = ?").get(ada.userId) as { expiresAt: unknown };
    const ms = typeof row.expiresAt === "number" ? row.expiresAt : Date.parse(String(row.expiresAt));
    expect(Math.abs(ms - (env.clock.now() + 7 * 24 * 3600_000))).toBeLessThan(60_000);
  });
});
