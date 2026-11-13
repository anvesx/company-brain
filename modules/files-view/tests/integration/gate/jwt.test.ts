import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { jwtAuth } from "../../../src/http/auth.js";
import { startOidc } from "../support/oidc.js";

let oidc: Awaited<ReturnType<typeof startOidc>>;
let auth: ReturnType<typeof jwtAuth>;
beforeAll(async () => {
  oidc = await startOidc();
  auth = jwtAuth({ jwksUrl: new URL(`${oidc.issuer}/jwks.json`), issuer: oidc.issuer, audience: "files-view" });
}, 120_000);
afterAll(async () => oidc.stop(), 120_000);

const A = { tenant: "t1", user: "alice" };
describe("jwtAuth against a real JWKS server", () => {
  it("a signed token gives the viewer with tenant, role and aliases", async () => {
    expect(await auth(await oidc.token({ ...A, aliases: ["a@x.io", "alice-gh"] }))).toEqual({ ...A, aliases: ["a@x.io", "alice-gh"], role: "member" });
  });
  it("only role=admin makes an admin", async () => {
    expect((await auth(await oidc.token({ ...A, role: "admin" }))).role).toBe("admin");
    expect((await auth(await oidc.token({ ...A, role: "member" }))).role).toBe("member");
  });
  it.each([
    ["forged", () => oidc.forged(A)],
    ["expired", () => oidc.expired(A)],
    ["wrong issuer", () => oidc.wrongIssuer(A)],
    ["garbage", async () => "not.a.jwt"],
  ])("rejects %s", async (_n, mk) => {
    await expect(auth(await mk())).rejects.toBeDefined();
  });
  it("rejects a token for another audience", async () => {
    const other = jwtAuth({ jwksUrl: new URL(`${oidc.issuer}/jwks.json`), issuer: oidc.issuer, audience: "someone-else" });
    await expect(other(await oidc.token(A))).rejects.toBeDefined();
  });
  it("rejects a token with no tenant claim", async () => {
    const other = jwtAuth({ jwksUrl: new URL(`${oidc.issuer}/jwks.json`), issuer: oidc.issuer, audience: "files-view", tenantClaim: "org" });
    await expect(other(await oidc.token(A))).rejects.toThrow(/subject or tenant/);
  });
});
