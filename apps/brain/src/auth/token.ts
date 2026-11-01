import { createHmac, timingSafeEqual } from "node:crypto";
import type { Principal } from "@brain/core-types";

export const MIN_SECRET_CHARS = 32;
const SIGNED = /^Bearer ([^:\s]+):([^:\s]+):([0-9a-f]{64})$/;

function need(secret: string): string {
  if (typeof secret !== "string" || secret.length < MIN_SECRET_CHARS) throw new Error(`BRAIN_AUTH_SECRET must be at least ${MIN_SECRET_CHARS} characters`);
  return secret;
}

const sign = (secret: string, user: string, tenant: string) => createHmac("sha256", secret).update(`${user}:${tenant}`).digest("hex");

/** Bearer token value `user:tenant:hmac-sha256-hex(secret, "user:tenant")`. For ops and tests. */
export function mintToken(secret: string, user: string, tenant: string): string {
  if (user.includes(":") || tenant.includes(":")) throw new Error("user and tenant must not contain a colon");
  return `${user}:${tenant}:${sign(need(secret), user, tenant)}`;
}

/** principalFor that accepts only correctly signed tokens. Anything else throws "unauthenticated". */
export function signedPrincipalFor(secret: string): (extra: unknown) => Principal {
  need(secret);
  return (extra) => {
    const headers = (extra as { requestInfo?: { headers?: Record<string, string | undefined> } }).requestInfo?.headers;
    const match = SIGNED.exec(headers?.authorization ?? "");
    if (!match) throw new Error("unauthenticated");
    const [, user = "", tenant = "", given = ""] = match;
    const want = Buffer.from(sign(secret, user, tenant), "hex");
    const got = Buffer.from(given, "hex");
    if (got.length !== want.length || !timingSafeEqual(got, want)) throw new Error("unauthenticated");
    return { id: user, tenantId: tenant, groups: [] };
  };
}
