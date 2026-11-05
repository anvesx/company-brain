import { describe, expect, it } from "vitest";
import { sameToken, signCsrf } from "../../../src/guard/session.js";

describe("csrf tokens", () => {
  it("rule 4: the same token matches itself", () => {
    expect(sameToken("abc", "abc")).toBe(true);
  });

  it("rule 4: a different token of the same length does not match", () => {
    expect(sameToken("abc", "abd")).toBe(false);
  });

  it("rule 4: a token of another length is false, not an exception", () => {
    expect(sameToken("abc", "abcd")).toBe(false);
    expect(sameToken("", "a")).toBe(false);
  });

  it("rule 4: a token is bound to the secret and to the session id", () => {
    const token = signCsrf("secret-one", "s1");
    expect(token).toBe(signCsrf("secret-one", "s1"));
    expect(token).not.toBe(signCsrf("secret-two", "s1"));
    expect(token).not.toBe(signCsrf("secret-one", "s2"));
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});
