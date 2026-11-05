import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { one } from "../../support/db.js";
import { type Person, signUp } from "../../support/http.js";
import { authorize, authParams, clientId, discover, oauthQuery, pkce } from "../../support/oauth.js";
import { boot, type Env } from "../../support/server.js";

let env: Env;
let ada: Person;
beforeEach(async () => {
  env = await boot();
  ada = await signUp(env, "Ada");
});
afterEach(() => env.close());

const active = (): unknown => one(env.db, "select activeOrganizationId as a from session where userId = ?", ada.userId)["a"];
const csrf = () => env.identity.csrf.issue(ada.browser.headers());

describe("picker: a refused organization leaves the session alone", () => {
  it("rule 3: a foreign organization is 400, the active one stays, and the consent page still renders", async () => {
    // Ada belongs to her personal organization (active) and to Acme; Bob's organization is not hers.
    const personal = (await env.identity.port.require(ada.browser.headers())).tenant;
    await ada.browser.call("/api/auth/organization/create", { json: { name: "Acme", slug: "acme" } });
    await ada.browser.call("/api/auth/organization/set-active", { json: { organizationId: personal } });
    const theirs = (await env.identity.port.require((await signUp(env, "Bob")).browser.headers())).tenant;
    const meta = await discover(env.base);
    const step = await authorize(ada.browser, meta, authParams(await clientId(meta), env.config.resource, pkce()));
    const query = oauthQuery(String(step.location));

    const res = await ada.browser.call("/picker", { form: { csrf: await csrf(), organizationId: theirs, oauth_query: query } });

    expect(res.status).toBe(400);
    expect(active()).toBe(personal);
    expect((await ada.browser.call(`/consent?${query}`)).status).toBe(200);
  });

  it("rule 3: an organization id that does not exist is 400 and leaves the active one too", async () => {
    const personal = (await env.identity.port.require(ada.browser.headers())).tenant;
    const res = await ada.browser.call("/picker", { form: { csrf: await csrf(), organizationId: "no-such-org" } });
    expect([res.status, active()]).toEqual([400, personal]);
  });
});
