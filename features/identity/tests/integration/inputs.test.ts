import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Browser, PASSWORD, signUp } from "../support/http.js";
import { boot, type Env } from "../support/server.js";

let env: Env;
beforeEach(async () => {
  env = await boot();
});
afterEach(() => env.close());

/** A raw POST, so the test controls the exact body and content type. */
const raw = (path: string, body: string, type: string) => fetch(env.base + path, { method: "POST", headers: { origin: env.base, "content-type": type }, body });

describe("rule 13: input errors keep one shape", () => {
  it("a body that is not JSON is 400 BAD_INPUT on `body`", async () => {
    const res = await raw("/api/auth/sign-in/email", "{bad", "application/json");
    expect([res.status, await res.json()]).toEqual([400, { code: "BAD_INPUT", field: "body", message: "body: send valid JSON" }]);
  });

  it.each(["null", "[]", '"x"'])("a JSON body of %s is 400 BAD_INPUT on `body`, not a raw schema error", async (body) => {
    const res = await raw("/api/auth/sign-in/email", body, "application/json");
    expect([res.status, await res.json()]).toEqual([400, { code: "BAD_INPUT", field: "body", message: "body: send a JSON object" }]);
  });

  it("a body with an unsupported content type is 400 BAD_INPUT on `body`, not 415", async () => {
    const res = await raw("/api/auth/sign-in/email", "a=b", "text/plain");
    expect([res.status, await res.json()]).toEqual([400, { code: "BAD_INPUT", field: "body", message: "body: send JSON or a form" }]);
  });

  it("a field with two problems is named once", async () => {
    const ada = await signUp(env, "Ada");
    const res = await ada.browser.call("/api/auth/organization/create", { json: { slug: 5 } });
    const body = await res.json();
    expect([res.status, body.field]).toEqual([400, "name"]);
    expect(String(body.message).match(/slug/g)?.length).toBe(1);
  });
});

describe("pages: sign-up and sign-in errors", () => {
  it("rule 2: a refused sign-up puts the escaped email back in the box", async () => {
    const email = `a"><b>@example.com`;
    const res = await new Browser(env.base).call("/sign-up", { form: { name: "Ada", email, password: PASSWORD } });
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('value="a&#34;&#62;&#60;b&#62;@example.com"');
  });

  it("rule 1: a taken email on the sign-up page is our wording and names email", async () => {
    const ada = await signUp(env, "Ada");
    const res = await new Browser(env.base).call("/sign-up", { form: { name: "Ada", email: ada.email, password: PASSWORD } });
    const page = await res.text();
    expect(res.status).toBe(422);
    expect(page).toContain("email: an account with this email already exists. Sign in instead.");
    expect(page).not.toContain("User already exists");
  });

  it("rule 2: a refused sign-in puts the escaped email back in the box", async () => {
    const email = `a"><b>@example.com`;
    const res = await new Browser(env.base).call("/sign-in", { form: { email, password: "wrong-password-123" } });
    expect(await res.text()).toContain('value="a&#34;&#62;&#60;b&#62;@example.com"');
  });
});
