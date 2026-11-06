import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { one } from "../../support/db.js";
import { json, type Person, signUp } from "../../support/http.js";
import { authorize, authParams, clientId, discover, oauthQuery, pkce } from "../../support/oauth.js";
import { boot, type Env } from "../../support/server.js";

let env: Env;
let ada: Person;
let personal: string;
let query: string;
beforeEach(async () => {
  env = await boot();
  ada = await signUp(env, "Ada");
  personal = (await env.identity.port.require(ada.browser.headers())).tenant;
  // Start the authorize request while Ada has one organization, so it goes straight to consent.
  const meta = await discover(env.base);
  const step = await authorize(ada.browser, meta, authParams(await clientId(meta), env.config.resource, pkce()));
  query = oauthQuery(String(step.location));
});
afterEach(() => env.close());

const active = (): unknown => one(env.db, "select activeOrganizationId as a from session where userId = ?", ada.userId)["a"];
const setActive = (body: unknown) => ada.browser.call("/api/auth/organization/set-active", { json: body });

describe("API set-active: a bad choice never clears the session's organization", () => {
  it("rule 3: a foreign, missing, empty, null or blank organizationId is 400 and changes nothing", async () => {
    const bobOrg = (await env.identity.port.require((await signUp(env, "Bob")).browser.headers())).tenant;
    const bad = [{ organizationId: bobOrg }, { organizationId: "no-such-org" }, {}, { organizationId: null }, { organizationId: "" }, { organizationId: "  " }];
    for (const body of bad) {
      const res = await setActive(body);
      expect([res.status, (await json<{ field: string }>(res)).field, active()]).toEqual([400, "organizationId", personal]);
      expect((await ada.browser.call(`/consent?${query}`)).status).toBe(200);
    }
  });

  it("rule 3: a form-encoded set-active is refused as 'send JSON', even naming the caller's own organization", async () => {
    const res = await ada.browser.call("/api/auth/organization/set-active", { form: { organizationId: personal } });
    expect([res.status, await res.json()]).toEqual([400, { code: "BAD_INPUT", field: "body", message: "body: send JSON" }]);
  });

  it("rule 3: switching to an organization the user belongs to still works", async () => {
    const acme = (await json<{ id: string }>(await ada.browser.call("/api/auth/organization/create", { json: { name: "Acme", slug: "acme" } }))).id;
    expect((await setActive({ organizationId: acme })).status).toBe(200);
    expect(active()).toBe(acme);
  });
});

describe("consent without an organization", () => {
  it("rule 3: a user in no organization at all gets NO_ORGANIZATION", async () => {
    env.db.prepare("delete from member where userId = ?").run(ada.userId);
    await expect(env.identity.consentView(ada.browser.headers(), query)).rejects.toMatchObject({ code: "NO_ORGANIZATION" });
  });
});
