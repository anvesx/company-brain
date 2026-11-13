import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { serve } from "@hono/node-server";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import type pg from "pg";
import { createFilesView, jwtAuth, pgGate } from "../../../src/index.js";

/** The production wiring over real HTTP: real Hono server, real JWKS endpoint, the module's own `jwtAuth` and `pgGate`. */
export async function startHttp(pool: pg.Pool) {
  const { publicKey, privateKey } = await generateKeyPair("RS256");
  const jwk = { ...(await exportJWK(publicKey)), kid: "k1", alg: "RS256", use: "sig" };
  const jwks = createServer((_q, r) => r.setHeader("content-type", "application/json").end(JSON.stringify({ keys: [jwk] })));
  await new Promise<void>((ok) => jwks.listen(0, "127.0.0.1", ok));
  const issuer = "http://scale.test";
  const jwksUrl = new URL(`http://127.0.0.1:${(jwks.address() as AddressInfo).port}/`);
  const limits = { perCheckMs: 5_000, totalMs: 60_000, top: 2_000 };
  const gate = await pgGate(pool, { recheck: async () => true, limits });
  const app = createFilesView({ pool, gate, auth: jwtAuth({ jwksUrl, issuer, audience: "files-view" }) });
  const server = serve({ port: 0, hostname: "127.0.0.1", fetch: app.fetch });
  await new Promise((ok) => server.once("listening", ok));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const token = (user: string, tenant = "t1") =>
    new SignJWT({ tenant, role: "member" })
      .setProtectedHeader({ alg: "RS256", kid: "k1" })
      .setSubject(user)
      .setIssuer(issuer)
      .setAudience("files-view")
      .setIssuedAt()
      .setExpirationTime("2h")
      .sign(privateKey);
  const stop = async () => {
    (server as unknown as Server).closeAllConnections();
    jwks.closeAllConnections();
    await Promise.all([new Promise((ok) => server.close(ok)), new Promise((ok) => jwks.close(ok))]);
  };
  return { base, token, stop };
}
