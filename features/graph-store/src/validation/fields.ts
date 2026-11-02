import { bad } from "../schema.js";

/** Byte caps (UTF-8) for the fixed node fields. Documented in the package README, "Limits". */
export const FIELD_MAX_BYTES = { title: 512, address: 2048, version: 256, source: 128 } as const;

// C0 controls and DEL: a multi-line or tabbed value is body text, not metadata.
export const hasControl = (v: string): boolean => [...v].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127);

export function checkField(name: keyof typeof FIELD_MAX_BYTES, v: unknown): string {
  if (typeof v !== "string") return bad("source, address, title, version must be strings");
  if (Buffer.byteLength(v, "utf8") > FIELD_MAX_BYTES[name]) bad(`${name} is over ${FIELD_MAX_BYTES[name]} bytes`);
  if (hasControl(v)) bad(`${name} must not contain control characters`);
  return v;
}
