import { createLocalJWKSet, errors, type JSONWebKeySet, jwtVerify } from "jose";
import type { ResolvedConfig } from "../config.js";
import { IdentityError } from "../errors.js";

const KEY_SET_LIFE_MS = 3_600_000;
/** An unknown key id may refetch the key set at most this often, so forged ids cannot make us hammer the service. */
const COOLDOWN_MS = 60_000;
const PROVEN_MAX = 1000;

export interface BearerClaims {
  sub: string;
  org_id?: string;
  scope?: string;
}

type Keys = ReturnType<typeof createLocalJWKSet>;

/**
 * Checks an access token against the service's own key set. The key set is fetched over HTTP and cached,
 * so a check costs no database lookup and no network call. It is fetched again after an hour, and for an
 * unknown key id at most once a minute. Fetches that overlap share one request.
 */
export const createBearerVerifier = (cfg: ResolvedConfig) => {
  const issuer = `${cfg.baseUrl}/api/auth`;
  let cached: { keys: Keys; at: number } | null = null;
  let pending: Promise<Keys> | null = null;
  // Tokens already proven valid. The signature is checked once; expiry is re-checked on every hit.
  // Only valid tokens get in, so forged ones cannot fill it, and a key set refresh never empties it.
  const proven = new Map<string, BearerClaims & { exp?: number }>();

  const load = (): Promise<Keys> => {
    pending ??= (async () => {
      const res = await fetch(`${issuer}/jwks`);
      if (!res.ok) throw new IdentityError("UNAUTHENTICATED", "signing keys are unavailable");
      cached = { keys: createLocalJWKSet((await res.json()) as JSONWebKeySet), at: cfg.now() };
      return cached.keys;
    })().finally(() => {
      pending = null;
    });
    return pending;
  };

  const check = async (token: string, keys: Keys) =>
    (await jwtVerify(token, keys, { issuer, audience: cfg.resource, currentDate: new Date(cfg.now()) })).payload as unknown as BearerClaims & { exp?: number };

  return async (token: string): Promise<BearerClaims> => {
    try {
      const seen = proven.get(token);
      if (seen && (seen.exp === undefined || seen.exp * 1000 > cfg.now())) return seen;
      const fresh = cached !== null && cfg.now() - cached.at < KEY_SET_LIFE_MS;
      let claims: BearerClaims & { exp?: number };
      try {
        claims = await check(token, cached !== null && fresh ? cached.keys : await load());
      } catch (error) {
        // A key we have not seen: the service may have rotated. Refetch, but only once the cooldown has passed.
        const cooling = cached !== null && cfg.now() - cached.at < COOLDOWN_MS;
        if (!(error instanceof errors.JWKSNoMatchingKey) || cooling) throw error;
        claims = await check(token, await load());
      }
      if (proven.size >= PROVEN_MAX) proven.delete(proven.keys().next().value as string);
      proven.set(token, claims);
      return claims;
    } catch (error) {
      if (error instanceof IdentityError) throw error;
      if (error instanceof errors.JWTExpired) throw new IdentityError("EXPIRED", "access token has expired");
      if (error instanceof errors.JWTClaimValidationFailed && error.claim === "aud") throw new IdentityError("WRONG_AUDIENCE", "token is for another resource");
      throw new IdentityError("UNAUTHENTICATED", "access token is not valid");
    }
  };
};
