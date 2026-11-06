import { decodeJwt } from "jose";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Browser, failure, json, type Person, signUp } from "../../support/http.js";
import { authorize, authParams, clientId, connect, discover, oauthQuery, pkce, refresh, type Tokens } from "../../support/oauth.js";
import { boot, type Env } from "../../support/server.js";

let env: Env;
beforeEach(async () => {
  env = await boot();
});
afterEach(() => env.close());

const createOrg = async (p: Person, name: string) =>
  (await json<{ id: string }>(await p.browser.call("/api/auth/organization/create", { json: { name, slug: name.toLowerCase() } }))).id;
const setActive = (b: Browser, organizationId: string) => b.call("/api/auth/organization/set-active", { json: { organizationId } });
const firstStop = async (b: Browser) => {
  const meta = await discover(env.base);
  const step = await authorize(b, meta, authParams(await clientId(meta), env.config.resource, pkce()));
  expect(step.status).toBe(302);
  return new URL(String(step.location), env.base);
};

describe("consent", () => {
  it("rule 7: a user with two organizations is sent to the picker, then to consent", async () => {
    const ada = await signUp(env, "Ada");
    const acme = await createOrg(ada, "Acme");
    expect((await firstStop(ada.browser)).pathname).toBe("/picker");
    const { tokens } = await connect(ada.browser, env.base, env.config.resource, (b) => setActive(b, acme));
    expect(decodeJwt(tokens.access_token)["org_id"]).toBe(acme);
  });

  it("rule 7: a user with one organization goes straight to consent", async () => {
    const ada = await signUp(env, "Ada");
    expect((await firstStop(ada.browser)).pathname).toBe("/consent");
  });

  it("rule 7: an anonymous browser is sent to sign in first", async () => {
    expect((await firstStop(new Browser(env.base))).pathname).toBe("/sign-in");
  });

  it("rule 7: the consent view shows client name, redirect host, scopes and the organization", async () => {
    const ada = await signUp(env, "Ada");
    const org = (await env.identity.port.require(ada.browser.headers())).tenant;
    const view = await env.identity.consentView(ada.browser.headers(), oauthQuery((await firstStop(ada.browser)).href));
    expect(view).toEqual({
      clientName: "test client",
      redirectHost: "127.0.0.1:8765",
      scopes: ["openid", "offline_access"],
      organization: { id: org, name: "Ada" },
    });
  });

  it("rule 7: the organization is fixed at consent; a later set-active does not move refreshed tokens", async () => {
    const ada = await signUp(env, "Ada");
    const personal = (await env.identity.port.require(ada.browser.headers())).tenant;
    const acme = await createOrg(ada, "Acme");
    const { meta, client, tokens } = await connect(ada.browser, env.base, env.config.resource, (b) => setActive(b, acme));
    await setActive(ada.browser, personal);
    const next = await json<Tokens>(await refresh(meta, client, tokens.refresh_token, env.config.resource));
    expect(decodeJwt(next.access_token)["org_id"]).toBe(acme);
  });

  it("rule 7: a forged query shows nothing from the query: unknown redirect is refused, unknown scopes are dropped", async () => {
    const ada = await signUp(env, "Ada");
    const query = oauthQuery((await firstStop(ada.browser)).href);
    const forge = (name: string, value: string) => query.replace(new RegExp(`${name}=[^&]*`), `${name}=${encodeURIComponent(value)}`);
    const headers = ada.browser.headers();
    expect((await failure(env.identity.consentView(headers, forge("redirect_uri", "https://evil.example.com/cb")))).code).toBe("BAD_INPUT");
    const view = await env.identity.consentView(headers, forge("scope", "openid <script>alert(1)</script>"));
    // Expected by hand: only the stored scope "openid" survives; the script text is not a stored scope.
    expect(view.scopes).toEqual(["openid"]);
  });

  it("rule 7: the consent page for a forged redirect_uri is an error page that echoes nothing", async () => {
    const ada = await signUp(env, "Ada");
    const query = oauthQuery((await firstStop(ada.browser)).href).replace(/redirect_uri=[^&]*/, "redirect_uri=https%3A%2F%2Fevil.example.com%2Fcb");
    const text = await (await ada.browser.call(`/consent?${query}`)).text();
    expect(text).not.toContain("evil.example.com");
  });
});
