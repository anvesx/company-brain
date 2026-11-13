import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { skip } from "../../../../features/google-identity/tests/support/db.js";
import { bootUi } from "./harness.js";

let s: Awaited<ReturnType<typeof bootUi>>;
beforeAll(async () => {
  if (!skip) s = await bootUi({ deny: true });
});
afterAll(() => s?.close());

const post = (headers: Record<string, string>) => ({ method: "POST", headers, body: "" });

describe.skipIf(skip)("who may see and change the pages", () => {
  it("sends a browser with no session to sign in, from every page", async () => {
    for (const p of ["/", "/connect/github", "/accounts/x"]) {
      const r = await fetch(`${s.base}${p}`, { redirect: "manual" });
      expect([r.status, r.headers.get("location")]).toEqual([302, "/sign-in"]);
    }
    expect((await fetch(`${s.base}/ui/app.css`)).headers.get("content-type")).toContain("text/css");
  });
  it("refuses a cross-site or foreign-origin post, and keeps the account", async () => {
    const b = await s.signedIn("cy");
    for (const h of [{ "sec-fetch-site": "cross-site" }, { origin: "http://evil.test" }]) {
      const r = await b.send(`${s.base}/sign-out`, post(h));
      expect(r.status).toBe(403);
    }
    expect((await b.send(`${s.base}/`)).status).toBe(200);
  });
  it("sends unknown and unavailable providers and accounts back with the reason", async () => {
    const b = await s.signedIn("dee");
    const unknown = await b.send(`${s.base}/connect/nope`);
    expect(unknown.headers.get("location")).toBe("/?error=not-found");
    const noClient = await b.send(`${s.base}/connect/slack`);
    expect(noClient.headers.get("location")).toBe("/?error=unavailable");
    const missing = await b.send(`${s.base}/accounts/none`);
    expect(missing.headers.get("location")).toBe("/?error=not-found");
  });
  it("shows the provider's refusal on Connections", async () => {
    const b = await s.signedIn("eve");
    const back = await s.connect(b);
    expect(back).toBe("/?oauth_error=denied");
    const html = await (await b.send(`${s.base}${back}`)).text();
    expect(html).toContain("The provider did not grant access.");
  });
  it("never repeats text from the query, and serves a favicon", async () => {
    const b = await s.signedIn("gus");
    for (const q of ["error=%3Cb%3Eboom%3C/b%3E", "oauth_error=constructor", "error=__proto__", "notice=toString"]) {
      const html = await (await b.send(`${s.base}/?${q}`)).text();
      expect(html).not.toMatch(/boom|constructor|__proto__|toString/);
    }
    expect(await b.send(`${s.base}/?error=bogus`).then((r) => r.text())).toContain("The request failed.");
    expect((await b.send(`${s.base}/favicon.ico`)).status).toBe(204);
  });
  it("signs out: the session cookie stops working", async () => {
    const b = await s.signedIn("fay");
    const r = await b.send(`${s.base}/sign-out`, post({ origin: s.base }));
    expect([r.status, r.headers.get("location")]).toEqual([303, "/sign-in"]);
    expect((await b.send(`${s.base}/v1/me`)).status).toBe(401);
  });
});
