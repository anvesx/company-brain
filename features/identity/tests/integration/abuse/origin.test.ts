import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { signUp } from "../../support/http.js";
import { boot, type Env } from "../../support/server.js";

let env: Env;
beforeEach(async () => {
  env = await boot();
});
afterEach(() => env.close());

const OUT = "/api/auth/sign-out";

describe("origin check on writes", () => {
  it("rule 6: a write from another origin is 403 with the forbidden_origin body", async () => {
    const ada = await signUp(env, "Ada");
    const res = await ada.browser.call(OUT, { method: "POST", origin: "https://evil.example" });
    expect([res.status, await res.json()]).toEqual([403, { error: "forbidden_origin" }]);
  });

  it("rule 6: a cookie-carrying write with no Origin is 403", async () => {
    const ada = await signUp(env, "Ada");
    expect((await ada.browser.call(OUT, { method: "POST", origin: null })).status).toBe(403);
  });

  it("rule 6: a write from our own origin goes through", async () => {
    const ada = await signUp(env, "Ada");
    expect((await ada.browser.call(OUT, { json: {} })).status).toBe(200);
  });

  it("rule 6: a write with no Origin and no cookie is allowed", async () => {
    const res = await fetch(`${env.base}${OUT}`, { method: "POST" });
    expect(res.status).not.toBe(403);
  });

  it("rule 6: reads never need an Origin", async () => {
    const ada = await signUp(env, "Ada");
    expect((await ada.browser.call("/connections")).status).toBe(200);
  });

  it("rule 6: the token endpoint is open to a foreign Origin; the check is not what answers", async () => {
    const res = await fetch(`${env.base}/api/auth/oauth2/token`, { method: "POST", headers: { origin: "https://evil.example" } });
    expect(res.status).not.toBe(403);
  });
});
