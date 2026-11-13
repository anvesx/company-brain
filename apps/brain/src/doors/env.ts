import { hkdfSync } from "node:crypto";
import { type IdentityConfig, parseSealKey } from "@anvesx/identity";
import { ConfigError } from "../serve/local/checks.js";
import { withBase } from "./base.js";
import { CATALOG } from "./catalog.js";

type Env = Record<string, string | undefined>;
/** The slice of identity's config that opens doors: Google as the way in, connectors as the things to link. */
export type Doors = Pick<IdentityConfig, "google" | "sealKey" | "providers" | "env" | "catalog">;

/**
 * The key that seals connector tokens at rest when no BRAIN_SEAL_KEY is given: derived from the auth secret with its
 * own label, so it never equals the cookie or cursor key. Rotating the auth secret then also makes stored connector
 * tokens unreadable (people re-link); an operator who wants to rotate the two apart sets BRAIN_SEAL_KEY.
 */
export const sealKeyFrom = (secret: string): string => Buffer.from(hkdfSync("sha256", secret, "", "connector seal v1", 32)).toString("hex");

/**
 * Reads the door settings up front, so a wrong value stops the start before any database is touched.
 * GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET switch on "Continue with Google"; one without the other is a mistake,
 * not a half-open door. Every catalog entry is handed over; identity greys the ones whose secrets are missing.
 * `env` is passed through so identity reads `<ID>_CLIENT_ID` from the same place this function did.
 */
export function doorsFromEnv(env: Env, secret: string): Doors {
  const [clientId, clientSecret] = [env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET];
  if (Boolean(clientId) !== Boolean(clientSecret)) throw new ConfigError("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET go together: set both or neither");
  const sealKey = env.BRAIN_SEAL_KEY || sealKeyFrom(secret);
  try {
    parseSealKey(sealKey);
  } catch {
    throw new ConfigError("BRAIN_SEAL_KEY must be 64 hex characters (32 bytes)");
  }
  return {
    sealKey,
    providers: CATALOG.map((entry) => withBase(entry, env)),
    // The same entries drive the read-only catalog list (what exists) and the link-able tiles (what is configured).
    catalog: CATALOG.map(({ name, description }) => ({ name, description })),
    env,
    ...(clientId && clientSecret && { google: { clientId, clientSecret } }),
  };
}
