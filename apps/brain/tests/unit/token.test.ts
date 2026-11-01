import { describe, expect, it } from "vitest";
import { mintToken, signedPrincipalFor } from "../../src/auth/token.js";

const secret = "s".repeat(32);
const bearer = (token: string) => ({ requestInfo: { headers: { authorization: `Bearer ${token}` } } });
const principalFor = signedPrincipalFor(secret);

describe("signed bearer tokens", () => {
  it("mints user:tenant:hmac-sha256-hex and accepts it", () => {
    const token = mintToken(secret, "alice", "acme");
    expect(token).toMatch(/^alice:acme:[0-9a-f]{64}$/);
    expect(principalFor(bearer(token))).toEqual({ id: "alice", tenantId: "acme", groups: [] });
  });
  it("rejects an unsigned or forged token", () => {
    for (const t of ["alice:acme", "alice:acme:", `alice:acme:${"0".repeat(64)}`, mintToken("x".repeat(32), "alice", "acme")]) {
      expect(() => principalFor(bearer(t))).toThrow("unauthenticated");
    }
  });
  it("a signature for one user or tenant does not carry to another", () => {
    const sig = mintToken(secret, "alice", "acme").split(":")[2];
    expect(() => principalFor(bearer(`bob:acme:${sig}`))).toThrow("unauthenticated");
    expect(() => principalFor(bearer(`alice:globex:${sig}`))).toThrow("unauthenticated");
  });
  it("rejects missing or malformed headers", () => {
    const token = mintToken(secret, "alice", "acme");
    expect(() => principalFor({})).toThrow("unauthenticated");
    expect(() => principalFor({ requestInfo: { headers: { authorization: token } } })).toThrow("unauthenticated");
    expect(() => principalFor(bearer(`${token}:extra`))).toThrow("unauthenticated");
  });
  it("refuses a secret shorter than 32 characters", () => {
    expect(() => signedPrincipalFor("short")).toThrow("BRAIN_AUTH_SECRET");
    expect(() => mintToken("short", "a", "b")).toThrow("BRAIN_AUTH_SECRET");
  });
  it("refuses user or tenant containing a colon", () => {
    expect(() => mintToken(secret, "a:b", "t")).toThrow("colon");
  });
});
