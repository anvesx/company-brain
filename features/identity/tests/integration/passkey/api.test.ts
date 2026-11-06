import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { count } from "../../support/db.js";
import { Browser, json, signUp } from "../../support/http.js";
import { boot, type Env } from "../../support/server.js";

let env: Env;
beforeEach(async () => {
  env = await boot();
});
afterEach(() => env.close());

const challengeCookie = (res: Response): string | undefined => res.headers.getSetCookie().find((line) => line.includes("better-auth-passkey="));

describe("passkey API (the plugin, behind our guards)", () => {
  it("rule 16: migrate creates the passkey table the plugin owns", () => {
    expect(count(env.db, "select count(*) as n from sqlite_master where type = 'table' and name = 'passkey'")).toBe(1);
  });

  it("rule 16: registration options need a session; signed in, the relying party is the host of baseUrl", async () => {
    expect((await new Browser(env.base).call("/api/auth/passkey/generate-register-options")).status).toBe(401);
    const ada = await signUp(env, "Ada");
    const res = await ada.browser.call("/api/auth/passkey/generate-register-options?name=laptop");
    expect(res.status).toBe(200);
    const options = await json<{ rp: { id: string; name: string }; challenge: string; user: { name: string } }>(res);
    expect(options.rp).toEqual({ id: new URL(env.base).hostname, name: "company-brain" });
    expect(options.challenge.length).toBeGreaterThan(16);
    // The plugin names the credential after `?name=` so the authenticator shows the name the person typed.
    expect(options.user.name).toBe("laptop");
    // The challenge is kept in a cookie the browser sends back with the signed answer.
    expect(challengeCookie(res)).toMatch(/HttpOnly/i);
  });

  it("rule 16: sign-in options need no session and carry no credential list, so a discoverable passkey is used", async () => {
    const res = await new Browser(env.base).call("/api/auth/passkey/generate-authenticate-options");
    expect(res.status).toBe(200);
    const options = await json<{ challenge: string; rpId: string; allowCredentials?: unknown[] }>(res);
    expect(options.rpId).toBe(new URL(env.base).hostname);
    expect(options.allowCredentials ?? []).toEqual([]);
    expect(challengeCookie(res)).toBeDefined();
    // The challenge itself lives server side in the verification table, keyed by the cookie's random token.
    expect(count(env.db, "select count(*) as n from verification where value like '%\"authentication\"%'")).toBe(1);
  });

  it("rule 16: a made-up answer is refused and sets no session cookie", async () => {
    const browser = new Browser(env.base);
    await browser.call("/api/auth/passkey/generate-authenticate-options");
    const res = await browser.call("/api/auth/passkey/verify-authentication", {
      json: { response: { id: "x", rawId: "x", response: {}, type: "public-key" } },
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(res.headers.getSetCookie().some((line) => line.includes("session_token=") && !line.includes("session_token=;"))).toBe(false);
    expect(browser.jar.has("better-auth.session_token")).toBe(false);
  });

  it("rule 12: a verify post from another origin is refused before the plugin sees it", async () => {
    const res = await new Browser(env.base).call("/api/auth/passkey/verify-authentication", { json: { response: {} }, origin: "https://evil.example.com" });
    expect(res.status).toBe(403);
  });

  it("rule 16: a new user has no passkeys, and listing them needs a session", async () => {
    expect((await new Browser(env.base).call("/api/auth/passkey/list-user-passkeys")).status).toBe(401);
    const ada = await signUp(env, "Ada");
    expect(await json(await ada.browser.call("/api/auth/passkey/list-user-passkeys"))).toEqual([]);
  });
});
