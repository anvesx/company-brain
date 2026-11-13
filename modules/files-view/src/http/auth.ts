import type { Who } from "@anvesx/visibility/gate";
import { createRemoteJWKSet, jwtVerify } from "jose";

/** Verifies one bearer token and returns the viewer it vouches for; rejects when the token is not valid. Only a signed token counts, never a plain header. */
export type Auth = (token: string) => Promise<Who>;

const str = (v: unknown): string => (typeof v === "string" ? v : "");

/**
 * Verifies `Authorization: Bearer <jwt>` against the OIDC provider's JWKS (signature, issuer, audience, expiry).
 * Claims: `sub` is the user, `tenant` (name configurable) the tenant, `role` "admin" for admins, `aliases` other names sources know them by.
 */
export function jwtAuth(o: { jwksUrl: URL; issuer: string; audience: string; tenantClaim?: string }): Auth {
  const keys = createRemoteJWKSet(o.jwksUrl);
  return async (token) => {
    const { payload } = await jwtVerify(token, keys, {
      issuer: o.issuer,
      audience: o.audience,
      algorithms: ["RS256", "RS384", "RS512", "ES256", "ES384", "PS256", "EdDSA"],
    });
    const [user, tenant] = [str(payload.sub), str(payload[o.tenantClaim ?? "tenant"])];
    if (!user || !tenant) throw new Error("token has no subject or tenant");
    const aliases = Array.isArray(payload["aliases"]) ? payload["aliases"].filter((a): a is string => typeof a === "string" && a !== "") : [];
    return { tenant, user, aliases, role: payload["role"] === "admin" ? "admin" : "member" };
  };
}
