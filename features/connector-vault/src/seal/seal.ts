import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { VaultError } from "../errors.js";
import type { Keyring } from "./keyring.js";

const NONCE = 12;
const TAG = 16;

/**
 * `<kid>.<base64(nonce | tag | ciphertext)>`, AES-256-GCM with the row id as additional data.
 * Throws KEY_EXHAUSTED when this key id has sealed `ring.maxSeals` values in this process: rotate to a new key.
 */
export function seal(ring: Keyring, id: string, plain: string): string {
  const used = ring.seals.get(ring.current.kid) ?? 0;
  if (used >= ring.maxSeals) throw new VaultError("KEY_EXHAUSTED", `key "${ring.current.kid}" reached its seal limit; rotate to a new key`);
  ring.seals.set(ring.current.kid, used + 1);
  const nonce = randomBytes(NONCE);
  const c = createCipheriv("aes-256-gcm", ring.current.key, nonce);
  c.setAAD(Buffer.from(id));
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `${ring.current.kid}.${Buffer.concat([nonce, c.getAuthTag(), body]).toString("base64")}`;
}

export const kidOf = (sealed: string): string => sealed.slice(0, Math.max(0, sealed.indexOf(".")));

/** A wrong key, another row's id, an unknown key id or any changed byte throws UNSEALABLE. It never returns garbage. */
export function open(ring: Keyring, id: string, sealed: string): string {
  const key = ring.byId.get(kidOf(sealed));
  const raw = Buffer.from(sealed.slice(kidOf(sealed).length + 1), "base64");
  if (key === undefined || raw.length < NONCE + TAG) throw new VaultError("UNSEALABLE", "sealed value cannot be opened");
  try {
    const d = createDecipheriv("aes-256-gcm", key, raw.subarray(0, NONCE));
    d.setAAD(Buffer.from(id));
    d.setAuthTag(raw.subarray(NONCE, NONCE + TAG));
    return Buffer.concat([d.update(raw.subarray(NONCE + TAG)), d.final()]).toString("utf8");
  } catch {
    throw new VaultError("UNSEALABLE", "sealed value cannot be opened");
  }
}
