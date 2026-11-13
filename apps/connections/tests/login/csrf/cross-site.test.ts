import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { skip } from "../../../../../features/google-identity/tests/support/db.js";
import { mint } from "../../http/fixture.js";
import { bootLogin } from "../harness.js";

let s: Awaited<ReturnType<typeof bootLogin>>;
beforeAll(async () => {
  if (!skip) s = await bootLogin();
});
afterAll(() => s?.close());

describe.skipIf(skip)("the session cookie refuses cross-site requests; the bearer is unaffected", () => {
  const body = JSON.stringify({ provider: "github", label: "w", kind: "pat", token: "ghp_x", access: "private" });
  const signedIn = async (id: string) => {
    s.oidc.signInAs(id, { email: `${id}@example.com`, verified: true });
    const b = s.browser();
    await b.continueWithGoogle();
    return b;
  };
  const post = (b: ReturnType<typeof s.browser>, headers: Record<string, string>) =>
    b.send(`${s.base}/v1/accounts`, { method: "POST", headers: { "content-type": "text/plain", ...headers }, body });

  it("a cross-origin text/plain POST with the cookie is 403 and creates nothing", async () => {
    const b = await signedIn("dee");
    expect((await post(b, { origin: "https://evil.example" })).status).toBe(403);
    expect((await post(b, { "sec-fetch-site": "cross-site" })).status).toBe(403);
    expect((await post(b, { "sec-fetch-site": "same-site", origin: "https://evil.example" })).status).toBe(403);
    expect(await (await b.send(`${s.base}/v1/accounts`)).json()).toEqual({ accounts: [] });
  });
  it("the same-origin POST creates the account", async () => {
    const b = await signedIn("eli");
    expect((await post(b, { origin: s.base, "sec-fetch-site": "same-origin" })).status).toBe(201);
  });
  it("the bearer is not subject to the check", async () => {
    const r = await fetch(`${s.base}/v1/accounts`, {
      method: "POST",
      headers: { authorization: mint("root", "t1"), origin: "https://evil.example", "sec-fetch-site": "cross-site" },
      body,
    });
    expect(r.status).toBe(201);
  });
  it("a cross-site navigation to oauth start is refused; same-origin gets past the check", async () => {
    const b = await signedIn("fay");
    for (const path of ["start"]) {
      const url = `${s.base}/v1/oauth/github/${path}`;
      expect((await b.send(url, { headers: { "sec-fetch-site": "cross-site" } })).status).toBe(403);
      expect((await b.send(url, { headers: { "sec-fetch-site": "same-origin" } })).status).not.toBe(403);
      expect((await b.send(url, { headers: { "sec-fetch-site": "none" } })).status).not.toBe(403);
    }
  });
});
