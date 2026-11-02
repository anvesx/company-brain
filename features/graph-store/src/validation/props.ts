import { bad } from "../schema.js";
import { hasControl } from "./fields.js";

// Denylist, not allowlist: callers use free-form metadata keys. Keys are compared with case and punctuation removed.
const FORBIDDEN_KEYS = [
  "text",
  "body",
  "content",
  "summary",
  "excerpt",
  "transcript",
  "snippet",
  "rawtext",
  "htmlbody",
  "markdown",
  "payload",
  "message",
  "preview",
  "abstract",
];
const flat = (k: string): string => k.toLowerCase().replace(/[^a-z0-9]/g, "");
const MAX_VALUE_BYTES = 1024;
const MAX_PROPS = 32;
const MAX_TOTAL_BYTES = 4096;
// Keys are identifiers: a sentence, path or paragraph cannot be smuggled in as a key.
const KEY = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/;

export function checkProps(props: unknown): Record<string, string> {
  if (typeof props !== "object" || props === null || Array.isArray(props)) return bad("props must be an object");
  const entries = Object.entries(props);
  if (entries.length > MAX_PROPS) bad(`props has more than ${MAX_PROPS} entries`);
  let total = 0;
  for (const [k, v] of entries) {
    if (!KEY.test(k)) bad(`props key "${k.slice(0, 40)}" must be an identifier of at most 64 bytes`);
    if (FORBIDDEN_KEYS.includes(flat(k))) bad(`props key "${k}" is not allowed: metadata only`);
    if (typeof v !== "string") bad(`props["${k}"] must be a string`);
    const n = Buffer.byteLength(v, "utf8");
    if (n > MAX_VALUE_BYTES) bad(`props["${k}"] is over 1 KiB`);
    if (hasControl(v)) bad(`props["${k}"] must not contain control characters`);
    total += n + k.length;
  }
  if (total > MAX_TOTAL_BYTES) bad(`props are over ${MAX_TOTAL_BYTES} bytes in total`);
  return props as Record<string, string>;
}
