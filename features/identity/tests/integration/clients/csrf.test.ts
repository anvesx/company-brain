import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Browser, failure, PASSWORD, type Person, signIn, signUp } from "../../support/http.js";
import { clientId, discover } from "../../support/oauth.js";
import { boot, type Env } from "../../support/server.js";

let env: Env;
let ada: Person;
beforeEach(async () => {
  env = await boot();
  ada = await signUp(env, "Ada");
});
afterEach(() => env.close());

describe("CSRF and Origin", () => {
  it("rule 12: a form token verifies only for the session it was issued to", async () => {
    const token = await env.identity.csrf.issue(ada.browser.headers());
    expect(await env.identity.csrf.verify(ada.browser.headers(), token)).toBe(true);
    const bob = await signUp(env, "Bob");
    expect(await env.identity.csrf.verify(bob.browser.headers(), token)).toBe(false);
  });

  it("rule 12: a tampered or empty token fails", async () => {
    const token = await env.identity.csrf.issue(ada.browser.headers());
    const tampered = `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`;
    expect(await env.identity.csrf.verify(ada.browser.headers(), tampered)).toBe(false);
    expect(await env.identity.csrf.verify(ada.browser.headers(), "")).toBe(false);
  });

  it("rule 12: a token dies with its session", async () => {
    const old = ada.browser.headers();
    const token = await env.identity.csrf.issue(old);
    await ada.browser.call("/api/auth/sign-out", { json: {} });
    expect(await env.identity.csrf.verify(old, token)).toBe(false);
  });

  it("rule 12: issuing a token needs a session", async () => {
    expect((await failure(env.identity.csrf.issue(new Headers()))).code).toBe("UNAUTHENTICATED");
  });

  it("rule 12: a write from a foreign Origin is 403 on sign-in and sign-up", async () => {
    const evil = { origin: "https://evil.example.com" };
    expect((await new Browser(env.base).call("/api/auth/sign-in/email", { json: { email: ada.email, password: PASSWORD }, ...evil })).status).toBe(403);
    const body = { name: "Eve", email: "eve@example.com", password: PASSWORD };
    expect((await new Browser(env.base).call("/api/auth/sign-up/email", { json: body, ...evil })).status).toBe(403);
  });

  it("rule 12: a cookie-carrying write with no Origin is 403", async () => {
    const res = await ada.browser.call("/api/auth/organization/create", { json: { name: "Acme", slug: "acme" }, origin: null });
    expect(res.status).toBe(403);
  });

  it("rule 12: the same-origin browser still signs in", async () => {
    expect((await signIn(new Browser(env.base), ada.email, PASSWORD)).status).toBe(200);
  });

  it("rule 12: MCP clients register and use the token endpoint with no Origin header", async () => {
    expect(await clientId(await discover(env.base))).toEqual(expect.any(String));
  });
});
