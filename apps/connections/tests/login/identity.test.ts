import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { skip } from "../../../../features/google-identity/tests/support/db.js";
import { bootLogin } from "./harness.js";

let s: Awaited<ReturnType<typeof bootLogin>>;
beforeAll(async () => {
  if (!skip) s = await bootLogin();
});
afterAll(() => s?.close());

describe.skipIf(skip)("Google sign-in through the real local OIDC server", () => {
  it("GET /sign-in shows one Google button and no email or password input", async () => {
    const r = await s.browser().send(`${s.base}/sign-in`);
    const html = await r.text();
    expect(r.status).toBe(200);
    expect(html).not.toMatch(/<input/i);
    expect(html.match(/btn btn-google/g)).toHaveLength(1);
    expect(r.headers.get("content-security-policy")).toContain("sha256-");
  });
  it("POST /sign-in/google redirects to the OIDC authorize URL", async () => {
    const r = await s.browser().send(`${s.base}/sign-in/google`, { method: "POST", headers: { origin: s.base } });
    expect(r.status).toBe(302);
    expect(r.headers.get("location")).toContain(`${s.oidc.issuer}/auth`);
  });
  it("the whole redirect chain ends with a session cookie, and /v1/me names the user", async () => {
    s.oidc.signInAs("ann", { email: "ann@example.com", verified: true });
    const b = s.browser();
    const done = await b.continueWithGoogle();
    expect(done.status).toBeLessThan(400);
    expect(b.trail.some((u) => u.startsWith(`${s.oidc.issuer}/auth`))).toBe(true);
    expect(b.trail.some((u) => u.includes("/api/auth/callback/google"))).toBe(true);
    expect([...b.cookies.keys()].some((k) => k.includes("session_token"))).toBe(true);
    const me = await b.send(`${s.base}/v1/me`);
    expect(await me.json()).toEqual({ user: "ann@example.com", tenant: "ann@example.com" });
  });
  it("an unverified Google email gets no session", async () => {
    s.oidc.signInAs("eve", { email: "eve@example.com", verified: false });
    const b = s.browser();
    await b.continueWithGoogle();
    expect((await b.send(`${s.base}/v1/me`)).status).toBe(401);
  });
});
