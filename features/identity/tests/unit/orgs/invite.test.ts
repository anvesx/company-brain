import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DAY, one, rows, shiftTime, toMs } from "../../support/db.js";
import { json, type Person, signUp } from "../../support/http.js";
import { boot, type Env } from "../../support/server.js";

let env: Env;
beforeEach(async () => {
  env = await boot();
});
afterEach(() => env.close());

const tenantOf = async (p: Person) => (await env.identity.port.require(p.browser.headers())).tenant;
const invite = async (from: Person, email: string, role = "member") => {
  const organizationId = await tenantOf(from);
  const res = await from.browser.call("/api/auth/organization/invite-member", { json: { email, role, organizationId } });
  expect(res.status).toBe(200);
  return { organizationId, id: (await json<{ id: string }>(res)).id };
};
const accept = (p: Person, invitationId: string) => p.browser.call("/api/auth/organization/accept-invitation", { json: { invitationId } });
const memberOf = (orgId: string, userId: string) => rows(env.db, "select role from member where organizationId = ? and userId = ?", orgId, userId);

describe("invitations", () => {
  it("rule 3: an invitation is sent by email through the sendEmail port", async () => {
    const ada = await signUp(env, "Ada");
    const { id } = await invite(ada, "bob@example.com");
    expect(env.mail).toHaveLength(1);
    expect(env.mail[0]).toMatchObject({ to: "bob@example.com" });
    expect(env.mail[0]?.text).toContain(id);
  });

  it("rule 3: the invitee accepts after signing in and joins with the invited role", async () => {
    const ada = await signUp(env, "Ada");
    const { id, organizationId } = await invite(ada, "bob@example.com", "admin");
    const bob = await signUp(env, "Bob", "bob@example.com");
    expect((await accept(bob, id)).status).toBe(200);
    expect(memberOf(organizationId, bob.userId)).toEqual([{ role: "admin" }]);
  });

  it("rule 3: invitations expire after 7 days", async () => {
    const ada = await signUp(env, "Ada");
    const { id } = await invite(ada, "bob@example.com");
    const expires = toMs(one(env.db, "select expiresAt from invitation where id = ?", id)["expiresAt"]);
    expect(Math.abs(expires - (Date.now() + 7 * DAY))).toBeLessThan(60_000);
  });

  it("rule 3: an expired invitation cannot be accepted", async () => {
    const ada = await signUp(env, "Ada");
    const { id, organizationId } = await invite(ada, "bob@example.com");
    shiftTime(env.db, "invitation", "expiresAt", id, -8 * DAY);
    const bob = await signUp(env, "Bob", "bob@example.com");
    expect((await accept(bob, id)).ok).toBe(false);
    expect(memberOf(organizationId, bob.userId)).toEqual([]);
  });

  it("rule 3: a different email cannot accept someone else's invitation", async () => {
    const ada = await signUp(env, "Ada");
    const { id, organizationId } = await invite(ada, "bob@example.com");
    const eve = await signUp(env, "Eve", "eve@example.com");
    expect((await accept(eve, id)).ok).toBe(false);
    expect(memberOf(organizationId, eve.userId)).toEqual([]);
  });
});
