import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { skip } from "../../../../features/google-identity/tests/support/db.js";
import { mint } from "../http/fixture.js";
import { bootLogin } from "./harness.js";

let s: Awaited<ReturnType<typeof bootLogin>>;
beforeAll(async () => {
  if (!skip) s = await bootLogin();
});
afterAll(() => s?.close());

describe.skipIf(skip)("the app behind Google sign-in", () => {
  it("sends a browser with no session from / to /sign-in", async () => {
    const r = await s.browser().send(`${s.base}/`);
    expect(r.status).toBe(302);
    expect(r.headers.get("location")).toBe("/sign-in");
  });
  it("the API answers 401 with no session and no bearer", async () => {
    expect((await s.browser().send(`${s.base}/v1/accounts`)).status).toBe(401);
  });
  it("serves the page to a signed-in browser, and its API accepts the cookie", async () => {
    s.oidc.signInAs("bob", { email: "bob@example.com", verified: true });
    const b = s.browser();
    await b.continueWithGoogle();
    const page = await b.send(`${s.base}/`);
    expect(page.status).toBe(200);
    const html = await page.text();
    expect(html).toContain("bob@example.com");
    expect(html).toContain("Connected apps");
    expect(html).not.toMatch(/type="password"|type="email"/);
    expect((await b.send(`${s.base}/v1/accounts`)).status).toBe(200);
  });
  it("a service caller's bearer still works with no cookie", async () => {
    const r = await fetch(`${s.base}/v1/accounts`, { headers: { authorization: mint("root", "t1") } });
    expect(r.status).toBe(200);
  });
  it("signing out ends the session", async () => {
    s.oidc.signInAs("cy", { email: "cy@example.com", verified: true });
    const b = s.browser();
    await b.continueWithGoogle();
    await b.send(`${s.base}/api/auth/sign-out`, { method: "POST", headers: { origin: s.base, "content-type": "application/json" }, body: "{}" });
    expect((await b.send(`${s.base}/v1/me`)).status).toBe(401);
  });
});
