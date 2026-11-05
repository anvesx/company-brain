import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Browser } from "../../support/http.js";
import { boot, type Env } from "../../support/server.js";

let env: Env;
beforeEach(async () => {
  env = await boot();
});
afterEach(() => env.close());

const signIn = async (body: unknown) => {
  const res = await new Browser(env.base).call("/api/auth/sign-in/email", { json: body });
  return [res.status, await res.json()];
};

describe("API sign-in: bad input is BAD_INPUT naming the field", () => {
  it("rule 13: a malformed email is BAD_INPUT on 'email', not better-auth's INVALID_EMAIL", async () => {
    expect(await signIn({ email: "nope", password: "x" })).toEqual([400, { code: "BAD_INPUT", field: "email", message: "email: must be an email address" }]);
  });

  it("rule 13: a missing email is BAD_INPUT on 'email' with no library text", async () => {
    const [status, body] = (await signIn({ password: "x" })) as [number, { code: string; field: string; message: string }];
    expect([status, body.code, body.field]).toEqual([400, "BAD_INPUT", "email"]);
    expect(body.message).not.toMatch(/body\.|Invalid input|received/);
  });

  it("rule 13: a password that is not text is BAD_INPUT on 'password'", async () => {
    const [status, body] = (await signIn({ email: "a@b.co", password: 5 })) as [number, { code: string; field: string }];
    expect([status, body.code, body.field]).toEqual([400, "BAD_INPUT", "password"]);
  });
});
