import { VaultError } from "../errors.js";

/** Random 96-bit GCM nonces stay safe to about 2^32 seals per key (NIST SP 800-38D 8.3). */
export const MAX_SEALS_PER_KEY = 2 ** 32;

export type Keyring = { current: { kid: string; key: Buffer }; byId: Map<string, Buffer>; maxSeals: number; seals: Map<string, number> };

const KID = /^[A-Za-z0-9_-]{1,16}$/;
const HEX = /^[0-9a-f]{64}$/i;
const bad = (why: string) => new VaultError("BAD_KEY", `CONNECTOR_VAULT_KEYS: ${why}`);

/** Decodes a key and asserts it is exactly 32 bytes (AES-256), whatever the caller checked before. */
export function decodeKey(hex: string): Buffer {
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) throw bad("a key must decode to 32 bytes");
  return key;
}

/**
 * `kid:hex64,kid:hex64`. The first entry seals new values; the rest only open old ones.
 * Rotation is: put a new key first, run `rotate`, then delete the old entry so it is rejected.
 * `maxSeals` is injectable for tests; `seal` throws KEY_EXHAUSTED once a key id has sealed that many values in this process.
 * A key equal to the auth secret is refused, so one leak never opens both.
 */
export function loadKeyring(raw: string | undefined, authSecret?: string, maxSeals = MAX_SEALS_PER_KEY): Keyring {
  if (raw === undefined || raw.trim() === "") throw bad("is not set");
  const byId = new Map<string, Buffer>();
  for (const part of raw.split(",")) {
    const [kid = "", hex = "", ...extra] = part.trim().split(":");
    if (extra.length > 0 || !KID.test(kid)) throw bad("each entry must be kid:hex");
    if (!HEX.test(hex)) throw bad(`key "${kid}" must be 64 hex characters`);
    if (byId.has(kid)) throw bad(`key id "${kid}" appears twice`);
    if (authSecret !== undefined && (hex.toLowerCase() === authSecret.toLowerCase() || Buffer.from(authSecret).equals(Buffer.from(hex, "hex"))))
      throw bad("must differ from BRAIN_AUTH_SECRET");
    byId.set(kid, decodeKey(hex));
  }
  const [kid, key] = byId.entries().next().value as [string, Buffer];
  return { current: { kid, key }, byId, maxSeals, seals: new Map() };
}
