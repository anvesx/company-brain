import type { BrainEnv, Env } from "../config/env.js";
import { KID, MIN_SECRET_CHARS } from "./claims.js";
import type { TokenPolicy } from "./token.js";

const LOOPBACK_V4 = /^127(\.\d{1,3}){3}$/;

export const isLoopback = (host: string): boolean => host === "localhost" || host === "::1" || host === "[::1]" || LOOPBACK_V4.test(host);

/**
 * Unsigned `user:tenant` tokens are for a throwaway demo on this machine. Anything else needs a signing secret:
 * the secret is the only thing standing between the network and every tenant's documents.
 */
export function requireAuthMode(env: Pick<BrainEnv, "authSecret" | "demo" | "host">): void {
  if (env.authSecret !== undefined) return;
  if (env.demo && isLoopback(env.host ?? "127.0.0.1")) return;
  throw new Error(`BRAIN_AUTH_SECRET (at least ${MIN_SECRET_CHARS} characters) is required unless BRAIN_DEMO=1 and BRAIN_HOST is a loopback address`);
}

export type VerifierPolicy = Required<Pick<TokenPolicy, "maxLifetimeSeconds">> & Pick<TokenPolicy, "keys">;

/** Extra verification keys (`BRAIN_AUTH_KEYS`, JSON `{kid: secret}`) and the longest lifetime a token may claim (default 24 hours). */
export function readTokenPolicy(env: Env): VerifierPolicy {
  const ttl = env.BRAIN_TOKEN_MAX_TTL_SECONDS;
  if (ttl !== undefined && (!/^\d{1,9}$/.test(ttl) || Number(ttl) <= 0))
    throw new Error(`BRAIN_TOKEN_MAX_TTL_SECONDS must be a positive whole number, got ${JSON.stringify(ttl)}`);
  const policy: VerifierPolicy = { maxLifetimeSeconds: ttl === undefined ? 86_400 : Number(ttl) };
  if (env.BRAIN_AUTH_KEYS === undefined) return policy;
  let keys: unknown;
  try {
    keys = JSON.parse(env.BRAIN_AUTH_KEYS);
  } catch {
    throw new Error('BRAIN_AUTH_KEYS must be JSON of the form {"kid": "secret"}');
  }
  const entries = typeof keys === "object" && keys !== null && !Array.isArray(keys) ? Object.entries(keys) : undefined;
  if (!entries || entries.some(([kid, key]) => !KID.test(kid) || typeof key !== "string" || key.length < MIN_SECRET_CHARS)) {
    throw new Error(`BRAIN_AUTH_KEYS must map kids ([A-Za-z0-9_.-]) to secrets of at least ${MIN_SECRET_CHARS} characters`);
  }
  return { ...policy, keys: keys as Record<string, string> };
}
