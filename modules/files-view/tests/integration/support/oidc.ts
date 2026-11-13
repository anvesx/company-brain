import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { createRemoteJWKSet, exportJWK, generateKeyPair, jwtVerify, SignJWT } from "jose";

export type Claims = { tenant: string; user: string; role?: "admin" | "member"; aliases?: string[] };

/**
 * A real local OIDC provider surface: an HTTP server that serves a JWKS document. Tokens are signed with
 * the matching private key (RS256), so the app under test must fetch the keys over HTTP and verify them.
 */
export async function startOidc() {
  const good = await generateKeyPair("RS256");
  const evil = await generateKeyPair("RS256");
  const jwk = { ...(await exportJWK(good.publicKey)), kid: "k1", alg: "RS256", use: "sig" };
  const server = createServer((_, res) => {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ keys: [jwk] }));
  });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const issuer = base;
  const sign = (c: Claims, key = good.privateKey, exp = "10m", iss = issuer) =>
    new SignJWT({ tenant: c.tenant, role: c.role ?? "member", aliases: c.aliases ?? [] })
      .setProtectedHeader({ alg: "RS256", kid: "k1" })
      .setSubject(c.user)
      .setIssuer(iss)
      .setAudience("files-view")
      .setIssuedAt()
      .setExpirationTime(exp)
      .sign(key);
  const jwks = createRemoteJWKSet(new URL(`${base}/jwks.json`));
  /** What the app gets as `auth`: fetches keys over HTTP and checks signature, issuer, audience and expiry. */
  const verify = async (token: string) => {
    const { payload } = await jwtVerify(token, jwks, { issuer, audience: "files-view", algorithms: ["RS256"] });
    return {
      tenant: String(payload["tenant"]),
      user: String(payload.sub),
      role: payload["role"] === "admin" ? ("admin" as const) : ("member" as const),
      aliases: (payload["aliases"] as string[]) ?? [],
    };
  };
  return {
    issuer,
    verify,
    token: (c: Claims) => sign(c),
    forged: (c: Claims) => sign(c, evil.privateKey),
    expired: (c: Claims) => sign(c, good.privateKey, "-1m"),
    wrongIssuer: (c: Claims) => sign(c, good.privateKey, "10m", "http://evil.example"),
    stop: () =>
      new Promise<void>((ok) => {
        server.closeAllConnections();
        server.close(() => ok());
      }),
  };
}
export type Oidc = Awaited<ReturnType<typeof startOidc>>;
