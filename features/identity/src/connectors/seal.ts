import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { IdentityError } from "../errors.js";

const NONCE = 12;
const TAG = 16;

/** The seal key: exactly 64 hex characters (32 bytes), or BAD_INPUT naming `sealKey`. */
export const parseSealKey = (hex: string | undefined): Buffer => {
  if (typeof hex !== "string" || !/^[0-9a-f]{64}$/i.test(hex)) throw new IdentityError("BAD_INPUT", "must be 64 hex characters (32 bytes)", "sealKey");
  return Buffer.from(hex, "hex");
};

/**
 * AES-256-GCM. The result is base64 of: 12-byte nonce, 16-byte tag, ciphertext.
 * The column name is the "additional data", so a value copied into another column fails to open.
 */
export const seal = (key: Buffer, field: string, plain: string): string => {
  const nonce = randomBytes(NONCE);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(Buffer.from(field));
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return Buffer.concat([nonce, cipher.getAuthTag(), body]).toString("base64");
};

/** The reverse of `seal`. A wrong key, a wrong column or any changed byte throws; it never returns garbage. */
export const open = (key: Buffer, field: string, sealed: string): string => {
  const raw = Buffer.from(sealed, "base64");
  if (raw.length < NONCE + TAG) throw new Error("sealed value is too short");
  const decipher = createDecipheriv("aes-256-gcm", key, raw.subarray(0, NONCE));
  decipher.setAAD(Buffer.from(field));
  decipher.setAuthTag(raw.subarray(NONCE, NONCE + TAG));
  return Buffer.concat([decipher.update(raw.subarray(NONCE + TAG)), decipher.final()]).toString("utf8");
};
