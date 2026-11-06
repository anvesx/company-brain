import { decodeJwt } from "jose";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { one } from "../../support/db.js";
import { type Browser, json, type Person, signUp } from "../../support/http.js";
import { authorize, authParams, bearer, clientId, consent, discover, LOOPBACK, pkce, token } from "../../support/oauth.js";
import { boot, type Env } from "../../support/server.js";

let env: Env;
let ada: Person;
let bob: Person;
let personal: string;
let beta: string;
beforeEach(async () => {
  env = await boot();
  [ada, bob] = [await signUp(env, "Ada"), await signUp(env, "Bob")];
  personal = (await env.identity.port.require(ada.browser.headers())).tenant;
  // Bob creates "Beta" (a name no user has), invites Ada, and Ada accepts and makes Beta her active organization.
  beta = (await json<{ id: string }>(await bob.browser.call("/api/auth/organization/create", { json: { name: "Beta", slug: "beta" } }))).id;
  const sent = await bob.browser.call("/api/auth/organization/invite-member", { json: { email: ada.email, role: "member", organizationId: beta } });
  await ada.browser.call("/api/auth/organization/accept-invitation", { json: { invitationId: (await json<{ id: string }>(sent)).id } });
  await ada.browser.call("/api/auth/organization/set-active", { json: { organizationId: beta } });
});
afterEach(() => env.close());

const active = (): unknown => one(env.db, "select activeOrganizationId as a from session where userId = ?", ada.userId)["a"];
const orgName = (id: string): string => String(one(env.db, "select name as n from organization where id = ?", id)["n"]);

/** authorize, open the consent page, press Allow, exchange the code. Returns the page text and the token response. */
async function allow(b: Browser) {
  const meta = await discover(env.base);
  const [client, p] = [await clientId(meta), pkce()];
  const at = String((await authorize(b, meta, authParams(client, env.config.resource, p))).location);
  const page = await (await b.call(at)).text();
  const code = await consent(b, at);
  const form = { grant_type: "authorization_code", code, redirect_uri: LOOPBACK, client_id: client, code_verifier: p.verifier, resource: env.config.resource };
  return { page, res: await token(meta, form) };
}

/** The org shown on the page, the org_id in the token, and /mcp's answer must all be the one organization `want`. */
async function expectGrantFor(b: Browser, want: string) {
  const { page, res } = await allow(b);
  expect(page).toContain(orgName(want));
  expect(res.status).toBe(200);
  const access = (await json<{ access_token: string }>(res)).access_token;
  expect(decodeJwt(access)["org_id"]).toBe(want);
  expect((await fetch(`${env.base}/mcp`, { headers: bearer(access) })).status).toBe(200);
  expect(active()).toBe(want);
}

describe("rule 7: the organization shown at consent is the organization the grant binds", () => {
  it("removed from the active organization: page, token and /mcp use the personal one, and the session row is healed", async () => {
    const removed = await bob.browser.call("/api/auth/organization/remove-member", { json: { memberIdOrEmail: ada.email, organizationId: beta } });
    expect([removed.status, active()]).toEqual([200, beta]);
    await expectGrantFor(ada.browser, personal);
  });

  it("the active organization is deleted: same", async () => {
    expect((await bob.browser.call("/api/auth/organization/delete", { json: { organizationId: beta } })).status).toBe(200);
    await expectGrantFor(ada.browser, personal);
  });

  it("the user leaves the active organization (active becomes null): same", async () => {
    expect((await ada.browser.call("/api/auth/organization/leave", { json: { organizationId: beta } })).status).toBe(200);
    expect(active()).toBeNull();
    await expectGrantFor(ada.browser, personal);
  });

  it("a user with no organization at all gets NO_ORGANIZATION on the consent page", async () => {
    env.db.prepare("delete from member where userId = ?").run(ada.userId);
    await expect(env.identity.consentView(ada.browser.headers(), "client_id=x")).rejects.toMatchObject({ code: "NO_ORGANIZATION" });
  });
});
