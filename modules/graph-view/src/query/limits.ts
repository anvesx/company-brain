import { createHmac, timingSafeEqual } from "node:crypto";
import { GraphError } from "@anvesx/graph-store";

/** Page size when the caller names none, and the largest size a caller may ask for. */
export const DEFAULT_LIMIT = 5_000;
export const MAX_LIMIT = 20_000;

const bad = (message: string): never => {
  throw new GraphError("BAD_INPUT", message);
};

/** The page size: an integer from 1 to 20,000, or the default. Anything else is BAD_INPUT (the route answers 400). */
export function pageSize(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_LIMIT;
  return Number.isInteger(limit) && limit >= 1 && limit <= MAX_LIMIT ? limit : bad(`limit must be an integer from 1 to ${MAX_LIMIT}`);
}

/** Cursor keys are exactly 32 bytes (a SHA-256 HMAC key). Anything else is BAD_INPUT, raised at mount time, not on the first request. */
export const KEY_BYTES = 32;
export function checkKey(key: Uint8Array): void {
  if (!(key instanceof Uint8Array) || key.length !== KEY_BYTES) bad(`cursorKey must be ${KEY_BYTES} bytes`);
}

// The key is injected, not made here: every server instance that shares it accepts the cursors the others issued,
// and a restart does not break a "Load more" a person already has on screen.
const sign = (key: Uint8Array, scope: string, id: string): string => createHmac("sha256", key).update(`${scope}\n${id}`).digest("base64url");

/**
 * The cursor is opaque to callers: the id of the last node already sent, in base64url, then a dot and a signature.
 * The signature covers the caller (`scope`), so a cursor cannot be made up or lent to another person.
 */
export const encodeCursor = (lastId: string, scope: string, key: Uint8Array): string =>
  `${Buffer.from(lastId, "utf8").toString("base64url")}.${sign(key, scope, lastId)}`;

/** The last id a cursor names, or undefined for "start at the top". A cursor we did not sign for this caller is BAD_INPUT. */
export function decodeCursor(cursor: string | undefined, scope: string, key: Uint8Array): string | undefined {
  if (cursor === undefined) return undefined;
  const [encoded = "", signature = "", ...extra] = cursor.split(".");
  const id = Buffer.from(encoded, "base64url").toString("utf8");
  const expected = Buffer.from(sign(key, scope, id));
  const given = Buffer.from(signature);
  // timingSafeEqual needs equal lengths; a wrong length is simply a forgery.
  const ok = extra.length === 0 && id !== "" && given.length === expected.length && timingSafeEqual(given, expected);
  return ok ? id : bad("cursor is not one this view issued");
}

/** A query-string number: plain digits only, else NaN. Number() alone would also take "+5", "5e2", "0x10" and " 5". */
export const digits = (value: string | undefined): number | undefined =>
  value === undefined ? undefined : /^[0-9]+$/.test(value) ? Number(value) : Number.NaN;

/** The time to draw the graph at: undefined for "now", else an integer of 0 or more. NaN (from "" or "abc"), negatives and fractions are BAD_INPUT. */
export const checkAsOf = (asOf: number | undefined): void => {
  if (asOf !== undefined && !(Number.isSafeInteger(asOf) && asOf >= 0)) bad("asOf must be an integer of 0 or more");
};
