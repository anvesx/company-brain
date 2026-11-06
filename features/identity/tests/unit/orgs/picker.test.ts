import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Browser, json, PASSWORD, type Person, signIn, signUp } from "../../support/http.js";
import { boot, type Env } from "../../support/server.js";

let env: Env;
beforeEach(async () => {
  env = await boot();
});
afterEach(() => env.close());

const createOrg = async (p: Person, name: string): Promise<string> => {
  const res = await p.browser.call("/api/auth/organization/create", { json: { name, slug: name.toLowerCase() } });
  expect(res.status).toBe(200);
  return (await json<{ id: string }>(res)).id;
};
const setActive = (b: Browser, organizationId: string) => b.call("/api/auth/organization/set-active", { json: { organizationId } });
const tenant = async (b: Browser) => (await env.identity.port.require(b.headers())).tenant;

describe("organization picker", () => {
  it("rule 3: setting the active organization changes the caller's tenant", async () => {
    const ada = await signUp(env, "Ada");
    const personal = await tenant(ada.browser);
    const acme = await createOrg(ada, "Acme");
    expect((await setActive(ada.browser, acme)).status).toBe(200);
    expect(await tenant(ada.browser)).toBe(acme);
    expect((await setActive(ada.browser, personal)).status).toBe(200);
    expect(await tenant(ada.browser)).toBe(personal);
  });

  it("rule 13: an unknown organization is BAD_INPUT naming organizationId", async () => {
    const ada = await signUp(env, "Ada");
    const res = await setActive(ada.browser, "org-that-does-not-exist");
    expect(res.status).toBe(400);
    expect(await json(res)).toMatchObject({ code: "BAD_INPUT", field: "organizationId" });
  });

  it("rule 3: another user's organization cannot be made active", async () => {
    const [ada, bob] = [await signUp(env, "Ada"), await signUp(env, "Bob")];
    const bobs = await tenant(bob.browser);
    const res = await setActive(ada.browser, bobs);
    expect(res.status).toBe(400);
    expect(await json(res)).toMatchObject({ code: "BAD_INPUT", field: "organizationId" });
    expect(await tenant(ada.browser)).not.toBe(bobs);
  });

  it("rule 3: exactly one organization is active per session; two sessions keep their own", async () => {
    const ada = await signUp(env, "Ada");
    const personal = await tenant(ada.browser);
    const acme = await createOrg(ada, "Acme");
    const laptop = new Browser(env.base);
    expect((await signIn(laptop, ada.email, PASSWORD)).status).toBe(200);
    await setActive(laptop, acme);
    expect(await tenant(laptop)).toBe(acme);
    await setActive(ada.browser, personal);
    expect(await tenant(ada.browser)).toBe(personal);
    expect(await tenant(laptop)).toBe(acme);
  });
});
