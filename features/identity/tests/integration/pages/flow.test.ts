import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { json, type Person, signUp } from "../../support/http.js";
import { authorize, authParams, clientId, discover, type Meta, oauthQuery, pkce } from "../../support/oauth.js";
import { boot, type Env } from "../../support/server.js";

let env: Env;
let ada: Person;
let meta: Meta;
beforeEach(async () => {
  env = await boot();
  ada = await signUp(env, "Ada");
  meta = await discover(env.base);
});
afterEach(() => env.close());

const csrf = () => env.identity.csrf.issue(ada.browser.headers());
const startFlow = async (): Promise<string> => {
  const client = await clientId(meta);
  return String((await authorize(ada.browser, meta, authParams(client, env.config.resource, pkce()))).location);
};
const makeOrg = async (name: string): Promise<string> =>
  (await json<{ id: string }>(await ada.browser.call("/api/auth/organization/create", { json: { name, slug: name.toLowerCase() } }))).id;

describe("consent form", () => {
  it("rule 4: Allow is 302 to the client's redirect_uri with a code and the state", async () => {
    const query = oauthQuery(await startFlow());
    const res = await ada.browser.call("/consent", { form: { csrf: await csrf(), oauth_query: query, accept: "true" } });
    const to = new URL(String(res.headers.get("location")));
    expect([res.status, to.origin + to.pathname, to.searchParams.get("state")]).toEqual([302, "http://127.0.0.1:8765/cb", "s1"]);
    expect(to.searchParams.get("code")).toBeTruthy();
  });

  it("rule 4: Deny is 302 to the redirect_uri with error=access_denied and no code", async () => {
    const query = oauthQuery(await startFlow());
    const res = await ada.browser.call("/consent", { form: { csrf: await csrf(), oauth_query: query, accept: "false" } });
    const to = new URL(String(res.headers.get("location")));
    expect([res.status, to.searchParams.get("error"), to.searchParams.has("code")]).toEqual([302, "access_denied", false]);
  });

  it("rule 4: a stale query is 400 with the start-again message", async () => {
    const res = await ada.browser.call("/consent", { form: { csrf: await csrf(), oauth_query: "client_id=gone", accept: "true" } });
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('<p role="alert">The request is no longer valid. Start again from your app.</p>');
  });
});

describe("organization picker", () => {
  it("rule 3: lists only the user's own organizations", async () => {
    await signUp(env, "Bob");
    await makeOrg("Acme");
    const body = await (await ada.browser.call("/picker")).text();
    expect(body).toContain(">Acme</button>");
    // The personal organization is named after the user.
    expect(body).toContain(">Ada</button>");
    expect(body).not.toContain(">Bob</button>");
  });

  it("rule 3: choosing an organization is 302 to /connections", async () => {
    const acme = await makeOrg("Acme");
    const res = await ada.browser.call("/picker", { form: { csrf: await csrf(), organizationId: acme } });
    expect([res.status, res.headers.get("location")]).toEqual([302, "/connections"]);
  });

  it("rule 3: with an oauth_query the choice continues to the consent page", async () => {
    const acme = await makeOrg("Acme");
    const query = oauthQuery(await startFlow());
    const res = await ada.browser.call("/picker", { form: { csrf: await csrf(), organizationId: acme, oauth_query: query } });
    expect(new URL(String(res.headers.get("location")), env.base).pathname).toBe("/consent");
  });

  it("rule 3: another user's organization is 400 and shows the guarded route's reason", async () => {
    const bob = await signUp(env, "Bob");
    const theirs = (await env.identity.port.require(bob.browser.headers())).tenant;
    const res = await ada.browser.call("/picker", { form: { csrf: await csrf(), organizationId: theirs } });
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('<p role="alert">organizationId: name an organization you belong to</p>');
  });
});
