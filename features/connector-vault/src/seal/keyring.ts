import { VaultError } from "../errors.js";

export type Keyring = { current: { kid: string; key: Buffer }; byId: Map<string, Buffer> };

const KID = /^[A-Za-z0-9_-]{1,16}$/;
const HEX = /^[0-9a-f]{64}$/i;
const bad = (why: string) => new VaultError("BAD_KEY", `CONNECTOR_VAULT_KEYS: ${why}`);

/**
 * `kid:hex64,kid:hex64`. The first entry seals new values; the rest only open old ones.
 * Rotation is: put a new key first, run `rotate`, then delete the old entry so it is rejected.
 * A key equal to the auth secret is refused, so one leak never opens both.
 */
export function loadKeyring(raw: string | undefined, authSecret?: string): Keyring {
  if (raw === undefined || raw.trim() === "") throw bad("is not set");
  const byId = new Map<string, Buffer>();
  for (const part of raw.split(",")) {
    const [kid = "", hex = "", ...extra] = part.trim().split(":");
    if (extra.length > 0 || !KID.test(kid)) throw bad("each entry must be kid:hex");
    if (!HEX.test(hex)) throw bad(`key "${kid}" must be 64 hex characters`);
    if (byId.has(kid)) throw bad(`key id "${kid}" appears twice`);
    if (authSecret !== undefined && (hex.toLowerCase() === authSecret.toLowerCase() || Buffer.from(authSecret).equals(Buffer.from(hex, "hex"))))
      throw bad("must differ from BRAIN_AUTH_SECRET");
    byId.set(kid, Buffer.from(hex, "hex"));
  }
  const [kid, key] = byId.entries().next().value as [string, Buffer];
  return { current: { kid, key }, byId };
}
