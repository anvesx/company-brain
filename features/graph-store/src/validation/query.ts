import { bad, text } from "../schema.js";
import { hasControl } from "./fields.js";

/**
 * The text of a title search. Titles never hold control characters, so a needle with one can match nothing
 * useful: a NUL even broke the SQL string ("unterminated string") or matched every row. Refuse it up front.
 */
export function checkNeedle(v: unknown): string {
  const needle = text("text", v);
  if (needle.length > 512) bad("text must be at most 512 characters");
  if (hasControl(needle)) bad("text must not contain control characters");
  return needle;
}
