import { createHmac, timingSafeEqual } from "node:crypto";
import type { Principal } from "@brain/core-types";

export const MIN_SECRET_CHARS = 32;
export const DEFAULT_TTL_SECONDS = 3600;
const SIGNED = /^Bearer ([^:\s]+):([^:\s]+):(\d{1,12}):([0-9a-f]{64})$/;

/** A correctly signed token past its `exp`. The message starts with "unauthenticated" so generic handlers treat it as such. */
export class TokenExpiredError extends Error {
  readonly code = "TOKEN_EXPIRED";
  constructor() {
    super("unauthenticated: token expired");
    this.name = "TokenExpiredError";
  }
}

function need(secret: string): string {
  if (typeof secret !== "string" || secret.length < MIN_SECRET_CHARS) throw new Error(`BRAIN_AUTH_SECRET must be at least ${MIN_SECRET_CHARS} characters`);
  return secret;
}

const sign = (secret: string, user: string, tenant: string, exp: string) => createHmac("sha256", secret).update(`${user}:${tenant}:${exp}`).digest("hex");

export type MintOptions = {
  /** Milliseconds, like `Date.now`. Injected so tests control expiry. */
  now?: () => number;
  /** Lifetime in whole seconds. Default one hour. */
  ttlSeconds?: number;
};

/**
 * Bearer token value `user:tenant:exp:hmac-sha256-hex(secret, "user:tenant:exp")`, `exp` in epoch seconds. For ops and tests.
 * Breaking: the earlier `user:tenant:hmac` form carried no expiry and is no longer accepted.
 */
export function mintToken(secret: string, user: string, tenant: string, { now = Date.now, ttlSeconds = DEFAULT_TTL_SECONDS }: MintOptions = {}): string {
  if (user.includes(":") || tenant.includes(":")) throw new Error("user and tenant must not contain a colon");
  if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) throw new Error("ttlSeconds must be a positive integer");
  const exp = String(Math.floor(now() / 1000) + ttlSeconds);
  return `${user}:${tenant}:${exp}:${sign(need(secret), user, tenant, exp)}`;
}

/**
 * principalFor that accepts only correctly signed, unexpired tokens. Anything else throws "unauthenticated";
 * a valid signature past `exp` throws `TokenExpiredError`. `now` is the clock in milliseconds.
 */
export function signedPrincipalFor(secret: string, now: () => number = Date.now): (extra: unknown) => Principal {
  need(secret);
  return (extra) => {
    const headers = (extra as { requestInfo?: { headers?: Record<string, string | undefined> } }).requestInfo?.headers;
    const match = SIGNED.exec(headers?.authorization ?? "");
    if (!match) throw new Error("unauthenticated");
    const [, user = "", tenant = "", exp = "", given = ""] = match;
    const want = Buffer.from(sign(secret, user, tenant, exp), "hex");
    const got = Buffer.from(given, "hex");
    if (got.length !== want.length || !timingSafeEqual(got, want)) throw new Error("unauthenticated");
    if (Math.floor(now() / 1000) >= Number(exp)) throw new TokenExpiredError();
    return { id: user, tenantId: tenant, groups: [] };
  };
}
