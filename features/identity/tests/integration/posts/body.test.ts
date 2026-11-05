import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type Person, signUp } from "../../support/http.js";
import { boot, type Env } from "../../support/server.js";

let env: Env;
let ada: Person;
beforeEach(async () => {
  env = await boot();
  ada = await signUp(env, "Ada");
});
afterEach(() => env.close());

/** A post with the body and Content-Type the test chooses, from a signed-in browser with the right Origin. */
const raw = (path: string, type: string, body: string): Promise<Response> => {
  const headers = ada.browser.headers();
  headers.set("origin", env.base);
  headers.set("content-type", type);
  return fetch(new URL(path, env.base), { method: "POST", headers, body, redirect: "manual" });
};
const NOT_FORM = "body: send this as a form post";

describe("form posts that are not forms", () => {
  it.each(["/sign-in", "/sign-up", "/picker", "/consent", "/sign-out"])("rule 13: JSON and plain text to %s are 400, never 500", async (path) => {
    for (const [type, body] of [
      ["application/json", '{"email":"a@b.co"}'],
      ["text/plain", "email=a@b.co"],
    ] as const) {
      const res = await raw(path, type, body);
      expect([path, type, res.status]).toEqual([path, type, 400]);
      expect(await res.text()).toContain(NOT_FORM);
    }
  });

  it("rule 13: a multipart body cut off before its boundary is 400, not 500", async () => {
    const res = await raw("/sign-in", "multipart/form-data; boundary=xyz", "--xyz\r\ncontent-disposition: form-data; name=email\r\n");
    expect(res.status).toBe(400);
    expect(await res.text()).toContain(NOT_FORM);
  });

  it("rule 12: a foreign Origin is still answered 403 before the body is looked at", async () => {
    const res = await ada.browser.call("/sign-in", { json: {}, origin: "https://evil.example.com" });
    expect(res.status).toBe(403);
  });
});

describe("POST /sign-in names the bad field", () => {
  const alert = async (form: Record<string, string>) => {
    const res = await ada.browser.call("/sign-in", { form });
    return [res.status, (await res.text()).match(/<p role="alert">([^<]*)<\/p>/)?.[1]];
  };

  it("rule 13: a missing password says 'password', not the library's schema text", async () => {
    expect(await alert({ email: ada.email })).toEqual([400, "password: is missing or the wrong type"]);
  });

  it("rule 13: a missing email says 'email'", async () => {
    expect(await alert({ password: "whatever-12345" })).toEqual([400, "email: is missing or the wrong type"]);
  });

  it("rule 13: a malformed email says it must be an email address", async () => {
    expect(await alert({ email: "nope", password: "whatever-12345" })).toEqual([400, "email: must be an email address"]);
  });
});
