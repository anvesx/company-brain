import { bad } from "../schema.js";

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

export function checkProps(props: unknown): Record<string, string> {
  if (typeof props !== "object" || props === null || Array.isArray(props)) return bad("props must be an object");
  for (const [k, v] of Object.entries(props)) {
    if (FORBIDDEN_KEYS.includes(flat(k))) bad(`props key "${k}" is not allowed: metadata only`);
    if (typeof v !== "string") bad(`props["${k}"] must be a string`);
    if (Buffer.byteLength(v, "utf8") > MAX_VALUE_BYTES) bad(`props["${k}"] is over 1 KiB`);
  }
  return props as Record<string, string>;
}
