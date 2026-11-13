import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { exportJWK, generateKeyPair, type JWK, SignJWT } from "jose";

export const ISS = "http://files-view.test";
export const AUD = "files-view";
export type Claims = { tenant: string; user: string; role?: string };

/** A real local JWKS endpoint plus a signer. `rogue` signs with a key the endpoint never publishes. */
export async function oidc() {
  const good = await generateKeyPair("RS256");
  const rogue = await generateKeyPair("RS256");
  const jwk: JWK = { ...(await exportJWK(good.publicKey)), kid: "k1", alg: "RS256", use: "sig" };
  const server: Server = createServer((_q, r) => r.setHeader("content-type", "application/json").end(JSON.stringify({ keys: [jwk] })));
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  const jwksUrl = new URL(`http://127.0.0.1:${(server.address() as AddressInfo).port}/`);
  const sign = (c: Claims, o: { key?: "good" | "rogue"; aud?: string; iss?: string; exp?: string; kid?: string } = {}) =>
    new SignJWT({ tenant: c.tenant, role: c.role ?? "member" })
      .setProtectedHeader({ alg: "RS256", kid: o.kid ?? "k1" })
      .setSubject(c.user)
      .setIssuer(o.iss ?? ISS)
      .setAudience(o.aud ?? AUD)
      .setIssuedAt()
      .setExpirationTime(o.exp ?? "5m")
      .sign((o.key === "rogue" ? rogue : good).privateKey);
  return { sign, jwksUrl, close: () => server.close() };
}
