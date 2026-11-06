import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { one, rows } from "../../support/db.js";
import { Browser, json, PASSWORD, signUp } from "../../support/http.js";
import { boot, type Env } from "../../support/server.js";

let env: Env;
beforeEach(async () => {
  env = await boot();
});
afterEach(() => env.close());

const attempt = (body: Record<string, string>) => new Browser(env.base).call("/api/auth/sign-up/email", { json: body });

describe("sign-up", () => {
  it("rule 1: sign-up creates the user and a personal organization named after the user", async () => {
    const ada = await signUp(env, "Ada Lovelace", "ada@example.com");
    expect(one(env.db, "select email, name from user where id = ?", ada.userId)).toEqual({ email: "ada@example.com", name: "Ada Lovelace" });
    const orgs = rows(env.db, "select o.name, m.role from organization o join member m on m.organizationId = o.id where m.userId = ?", ada.userId);
    expect(orgs).toEqual([{ name: "Ada Lovelace", role: "owner" }]);
  });

  it("rule 1: the personal organization is active on the new session", async () => {
    const ada = await signUp(env, "Ada");
    const org = one(env.db, "select organizationId as id from member where userId = ?", ada.userId)["id"];
    const caller = await env.identity.port.require(ada.browser.headers());
    expect(caller).toEqual({ user: ada.userId, tenant: org, kind: "session", scopes: [] });
    expect(one(env.db, "select activeOrganizationId as a from session where userId = ?", ada.userId)["a"]).toBe(org);
  });

  it("rule 1: two users get two separate organizations", async () => {
    const [a, b] = [await signUp(env, "Ada"), await signUp(env, "Brendan")];
    const tenantA = (await env.identity.port.require(a.browser.headers())).tenant;
    const tenantB = (await env.identity.port.require(b.browser.headers())).tenant;
    expect(tenantA).not.toBe(tenantB);
  });

  it.each([
    ["empty", ""],
    ["no at sign", "ada.example.com"],
    ["no domain", "ada@"],
  ])("rule 13: an email that is %s is BAD_INPUT naming email", async (_why, email) => {
    const res = await attempt({ name: "Ada", email, password: PASSWORD });
    expect(res.status).toBe(400);
    expect(await json(res)).toMatchObject({ code: "BAD_INPUT", field: "email" });
    expect(rows(env.db, "select id from user")).toEqual([]);
  });

  it("rule 1: an email already taken does not create a second user or organization", async () => {
    await signUp(env, "Ada", "ada@example.com");
    const res = await attempt({ name: "Ada 2", email: "ada@example.com", password: PASSWORD });
    expect(res.ok).toBe(false);
    expect(rows(env.db, "select id from organization")).toHaveLength(1);
  });
});
