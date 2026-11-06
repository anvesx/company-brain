import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Browser, json, type Person, signUp } from "../../support/http.js";
import { connect, refresh } from "../../support/oauth.js";
import { boot, type Env } from "../../support/server.js";

let env: Env;
let ada: Person;
beforeEach(async () => {
  env = await boot();
  ada = await signUp(env, "Ada");
});
afterEach(() => env.close());

const csrf = () => env.identity.csrf.issue(ada.browser.headers());

describe("account page", () => {
  it("rule 11: /account lists the allowed client and its Revoke button; with none it says so", async () => {
    expect(await (await ada.browser.call("/account")).text()).toContain("No apps yet.");
    await connect(ada.browser, env.base, env.config.resource);
    const text = await (await ada.browser.call("/account")).text();
    // The dynamic test client is registered under the name "test client".
    expect(text).toContain("test client");
    expect(text).toContain('action="/account/revoke"');
  });

  it("rule 11: pressing Revoke kills that client's refresh token and empties the list", async () => {
    const { meta, client, tokens } = await connect(ada.browser, env.base, env.config.resource);
    const res = await ada.browser.call("/account/revoke", { form: { csrf: await csrf(), clientId: client } });
    expect([res.status, res.headers.get("location")]).toEqual([302, "/account"]);
    expect(await json(await refresh(meta, client, tokens.refresh_token, env.config.resource))).toMatchObject({ error: "invalid_grant" });
    expect(await (await ada.browser.call("/account")).text()).toContain("No apps yet.");
  });

  it("rule 12: a revoke from a foreign Origin or without a csrf token is 403 and revokes nothing", async () => {
    const { client } = await connect(ada.browser, env.base, env.config.resource);
    expect((await ada.browser.call("/account/revoke", { form: { csrf: await csrf(), clientId: client }, origin: "https://evil.example.com" })).status).toBe(
      403,
    );
    expect((await ada.browser.call("/account/revoke", { form: { clientId: client } })).status).toBe(403);
    expect(await (await ada.browser.call("/account")).text()).toContain("test client");
  });

  it("rule 11: an anonymous browser is sent to sign in", async () => {
    const res = await new Browser(env.base).call("/account");
    expect([res.status, res.headers.get("location")]).toEqual([302, "/sign-in"]);
  });
});
