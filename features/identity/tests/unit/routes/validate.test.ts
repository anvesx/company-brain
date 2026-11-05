import { describe, expect, it } from "vitest";
import { badInput, bodyOf, checkSignUp, tooMany } from "../../../src/routes/validate.js";

const post = (body: unknown) => new Request("http://x/", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) });
const GOOD = { email: "ada@example.com", password: "violet-anchor-quartz-1987" };

describe("request validation helpers", () => {
  it("rule 13: badInput is a 400 JSON body with code, field, message and any extras", async () => {
    const res = badInput("f", "why", { more: 1 });
    expect([res.status, await res.json()]).toEqual([400, { code: "BAD_INPUT", field: "f", message: "why", more: 1 }]);
  });

  it("rule 2: tooMany is 429 with the wait in seconds as Retry-After", async () => {
    const res = tooMany(42);
    expect([res.status, res.headers.get("retry-after"), await res.json()]).toEqual([429, "42", { error: "too_many_requests" }]);
  });

  it("rule 13: bodyOf reads JSON objects, leaves the request readable, and gives null for anything else", async () => {
    const req = post({ a: 1 });
    expect(await bodyOf(req)).toEqual({ a: 1 });
    expect(await req.json()).toEqual({ a: 1 });
    for (const bad of ["null", "7", "not json"]) expect(await bodyOf(post(bad))).toBeNull();
  });

  it("rule 1: a good email and password pass the sign-up check", async () => {
    expect(await checkSignUp(post(GOOD))).toBeNull();
  });

  it("rule 13: a bad email is BAD_INPUT naming email; a missing email is the same", async () => {
    for (const email of ["nope", undefined]) {
      const res = await checkSignUp(post({ ...GOOD, email }));
      expect([res?.status, await res?.json()]).toEqual([400, { code: "BAD_INPUT", field: "email", message: "email: must be an email address" }]);
    }
  });

  it("rule 13: a short or missing password is BAD_INPUT naming password with the length message", async () => {
    for (const password of ["short", undefined]) {
      const res = await checkSignUp(post({ ...GOOD, password }));
      expect([res?.status, await res?.json()]).toMatchObject([
        400,
        { code: "BAD_INPUT", field: "password", message: "password: must be 12 to 128 characters" },
      ]);
    }
  });

  it("rule 13: a body that is not JSON fails the email check", async () => {
    expect((await (await checkSignUp(post("nope")))?.json())?.field).toBe("email");
  });
});
