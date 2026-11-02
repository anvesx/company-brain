import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const HEX_KEY = /^[0-9a-f]{64}$/i;

/** CONNECTIONS_KEY is 32 random bytes as 64 hex characters (for example `openssl rand -hex 32`). */
export function parseKey(raw: string | undefined): Buffer {
  if (!raw || !HEX_KEY.test(raw)) throw new Error("CONNECTIONS_KEY must be 64 hex characters (32 bytes)");
  return Buffer.from(raw, "hex");
}

/** AES-256-GCM; output is base64 of iv(12) | tag(16) | ciphertext. The account id is bound as associated data. */
export function seal(key: Buffer, id: string, plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  c.setAAD(Buffer.from(id));
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), body]).toString("base64");
}

export function open(key: Buffer, id: string, sealed: string): string {
  const raw = Buffer.from(sealed, "base64");
  const d = createDecipheriv("aes-256-gcm", key, raw.subarray(0, 12));
  d.setAAD(Buffer.from(id));
  d.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString("utf8");
}
