import type { ScanQuery } from "../scan/scan.js";
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

/** Candidates one scan looks at when the caller gives no `cap`. */
export const DEFAULT_CAP = 4096;

/**
 * Checks `limit`, `cap` and `cursor` the same way for both dialects, before any SQL runs. A cursor above
 * 2^53 - 1 is refused: no row we handed out has one, and Postgres bigint overflows at 2^63 (raw error 22003).
 */
export function scanBounds(q: ScanQuery): { cap: number; after: number } {
  if (!Number.isInteger(q?.limit) || q.limit < 1 || q.limit > 1000) bad("limit must be a whole number from 1 to 1000");
  const cap = q.cap ?? DEFAULT_CAP;
  if (!Number.isInteger(cap) || cap < 1 || cap > 1_000_000) bad("cap must be a whole number from 1 to 1000000");
  const after = q.cursor ?? 0;
  if (!Number.isSafeInteger(after) || after < 0) bad("cursor must be a whole number from 0 to 2^53 - 1");
  return { cap, after };
}
