import { decodeJwt } from "jose";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MINUTE } from "../../support/db.js";
import { failure, json, type Person, signUp } from "../../support/http.js";
import { bearer, connect, refresh } from "../../support/oauth.js";
import { boot, type Env } from "../../support/server.js";

let env: Env;
beforeEach(async () => {
  env = await boot();
});
afterEach(() => env.close());

/** Ada owns an organization; Bob joins it as a member and connects an MCP client to it. */
async function bobConnected() {
  const ada = await signUp(env, "Ada");
  const org = (await env.identity.port.require(ada.browser.headers())).tenant;
  const sent = await ada.browser.call("/api/auth/organization/invite-member", { json: { email: "bob@example.com", role: "member", organizationId: org } });
  const bob: Person = await signUp(env, "Bob", "bob@example.com");
  await bob.browser.call("/api/auth/organization/accept-invitation", { json: { invitationId: (await json<{ id: string }>(sent)).id } });
  const pick = (b: typeof bob.browser) => b.call("/api/auth/organization/set-active", { json: { organizationId: org } });
  const session = await connect(bob.browser, env.base, env.config.resource, pick);
  expect(decodeJwt(session.tokens.access_token)["org_id"]).toBe(org);
  const removeBob = () => ada.browser.call("/api/auth/organization/remove-member", { json: { memberIdOrEmail: bob.email, organizationId: org } });
  return { ...session, org, removeBob };
}

describe("membership and refresh", () => {
  it("rule 6: a member can refresh while still a member", async () => {
    const { meta, client, tokens } = await bobConnected();
    expect((await refresh(meta, client, tokens.refresh_token, env.config.resource)).status).toBe(200);
  });

  it("rule 6: refresh fails with invalid_grant once the user is no longer a member", async () => {
    const { meta, client, tokens, removeBob } = await bobConnected();
    expect((await removeBob()).status).toBe(200);
    const res = await refresh(meta, client, tokens.refresh_token, env.config.resource);
    expect(res.status).toBe(400);
    expect(await json(res)).toMatchObject({ error: "invalid_grant" });
  });

  it("rule 11: the access token already issued lives until its 15 minutes run out, then is EXPIRED", async () => {
    const { tokens, removeBob } = await bobConnected();
    await removeBob();
    const headers = new Headers(bearer(tokens.access_token));
    expect((await env.identity.port.fromBearer(headers))?.kind).toBe("mcp");
    env.clock.advance(15 * MINUTE + 1000);
    expect((await failure(env.identity.port.fromBearer(headers))).code).toBe("EXPIRED");
  });
});
