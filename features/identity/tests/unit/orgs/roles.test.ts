import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { one, rows } from "../../support/db.js";
import { json, type Person, signUp } from "../../support/http.js";
import { boot, type Env } from "../../support/server.js";

let env: Env;
beforeEach(async () => {
  env = await boot();
});
afterEach(() => env.close());

type Team = { org: string; owner: Person; admin: Person; member: Person };

/** Ada owns her personal organization; Bob joins as admin and Cy as member through invitations. */
async function team(): Promise<Team> {
  const owner = await signUp(env, "Ada");
  const org = (await env.identity.port.require(owner.browser.headers())).tenant;
  const join = async (name: string, role: string) => {
    const email = `${name.toLowerCase()}@example.com`;
    const sent = await owner.browser.call("/api/auth/organization/invite-member", { json: { email, role, organizationId: org } });
    const person = await signUp(env, name, email);
    await person.browser.call("/api/auth/organization/accept-invitation", { json: { invitationId: (await json<{ id: string }>(sent)).id } });
    return person;
  };
  return { org, owner, admin: await join("Bob", "admin"), member: await join("Cy", "member") };
}

const invite = (by: Person, org: string, email: string, role = "member") =>
  by.browser.call("/api/auth/organization/invite-member", { json: { email, role, organizationId: org } });
const remove = (by: Person, org: string, memberIdOrEmail: string) =>
  by.browser.call("/api/auth/organization/remove-member", { json: { memberIdOrEmail, organizationId: org } });

describe("roles", () => {
  it("rule 3: the creator is owner, invitees hold the invited role", async () => {
    const t = await team();
    const roles = rows(env.db, "select u.name, m.role from member m join user u on u.id = m.userId where m.organizationId = ? order by u.name", t.org);
    expect(roles).toEqual([
      { name: "Ada", role: "owner" },
      { name: "Bob", role: "admin" },
      { name: "Cy", role: "member" },
    ]);
  });

  it("rule 3: a member may not invite", async () => {
    const t = await team();
    expect((await invite(t.member, t.org, "dee@example.com")).status).toBe(403);
    expect(rows(env.db, "select id from invitation where email = ?", "dee@example.com")).toEqual([]);
  });

  it("rule 3: a member may not remove anyone", async () => {
    const t = await team();
    expect((await remove(t.member, t.org, t.admin.email)).status).toBe(403);
    expect(rows(env.db, "select id from member where userId = ?", t.admin.userId)).toHaveLength(2);
  });

  it("rule 3: an admin may invite and may remove a member", async () => {
    const t = await team();
    expect((await invite(t.admin, t.org, "dee@example.com")).status).toBe(200);
    expect((await remove(t.admin, t.org, t.member.email)).status).toBe(200);
    expect(rows(env.db, "select id from member where organizationId = ? and userId = ?", t.org, t.member.userId)).toEqual([]);
  });

  it("rule 13: an unknown role is BAD_INPUT naming role", async () => {
    const t = await team();
    const res = await invite(t.owner, t.org, "dee@example.com", "superuser");
    expect(res.status).toBe(400);
    expect(await json(res)).toMatchObject({ code: "BAD_INPUT", field: "role" });
    expect(one(env.db, "select count(*) as n from invitation where email = ?", "dee@example.com")["n"]).toBe(0);
  });
});
