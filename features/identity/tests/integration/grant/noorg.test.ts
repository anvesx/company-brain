import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { one } from "../../support/db.js";
import { Browser, json, type Person, signUp } from "../../support/http.js";
import { authorize, authParams, clientId, discover, pkce } from "../../support/oauth.js";
import { boot, type Env } from "../../support/server.js";

const MESSAGE = "You do not belong to an organization yet.";

let env: Env;
let ada: Person;
beforeEach(async () => {
  env = await boot();
  ada = await signUp(env, "Ada");
});
afterEach(() => env.close());

/** Ada reaches "no organization" through the API alone: she joins Beta, leaves it, then deletes her personal organization. */
async function loseEveryOrganization(): Promise<void> {
  const bob = await signUp(env, "Bob");
  const personal = (await env.identity.port.require(ada.browser.headers())).tenant;
  const beta = (await json<{ id: string }>(await bob.browser.call("/api/auth/organization/create", { json: { name: "Beta", slug: "beta" } }))).id;
  const sent = await bob.browser.call("/api/auth/organization/invite-member", { json: { email: ada.email, role: "member", organizationId: beta } });
  await ada.browser.call("/api/auth/organization/accept-invitation", { json: { invitationId: (await json<{ id: string }>(sent)).id } });
  expect((await ada.browser.call("/api/auth/organization/leave", { json: { organizationId: beta } })).status).toBe(200);
  expect((await ada.browser.call("/api/auth/organization/delete", { json: { organizationId: personal } })).status).toBe(200);
  expect(one(env.db, "select count(*) as n from member where userId = ?", ada.userId)["n"]).toBe(0);
}

describe("rule 12: a signed-in user with no organization sees a page at the authorize URL, never raw JSON", () => {
  it("GET authorize sends the browser to the consent page, which renders NO_ORGANIZATION as HTML and issues no code", async () => {
    await loseEveryOrganization();
    const meta = await discover(env.base);
    const res = await authorize(ada.browser, meta, authParams(await clientId(meta), env.config.resource, pkce()));
    expect([res.status, res.location?.startsWith("/consent?"), res.body]).toEqual([302, true, ""]);
    const page = await ada.browser.call(String(res.location));
    const text = await page.text();
    expect([page.status, page.headers.get("content-type")?.startsWith("text/html")]).toEqual([400, true]);
    expect(text).toContain(`role="alert">${MESSAGE}`);
    expect(text).not.toContain('"NO_ORGANIZATION"');
    expect(one(env.db, "select count(*) as n from verification")["n"]).toBe(0);
  });

  it("any other 403 from authorize stays as it is (the redirect is only for NO_ORGANIZATION)", async () => {
    const meta = await discover(env.base);
    // A signed-out browser is sent to sign-in, not to consent.
    const res = await authorize(new Browser(env.base), meta, authParams(await clientId(meta), env.config.resource, pkce()));
    expect([res.status, res.location?.startsWith("/sign-in")]).toEqual([302, true]);
  });
});
