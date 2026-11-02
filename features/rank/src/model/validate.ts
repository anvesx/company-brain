import { RankError } from "./errors.js";
import type { Doc, SearchRequest } from "./types.js";

const MAX_LEN = 1024;
const MAX_PRINCIPAL = 256;
const MAX_PRINCIPALS = 256;

/** Lone surrogates cannot be encoded to UTF-8 faithfully. */
const wellFormed = (s: string): boolean => !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(s);
const isText = (v: unknown): v is string => typeof v === "string" && wellFormed(v);
/** Identifiers must survive a round trip through SQLite and JSON: well-formed UTF-16, no NUL. */
const isKey = (v: unknown, max: number): v is string => isText(v) && v.length > 0 && v.length <= max && !v.includes("\0");
const isKeys = (v: unknown, max: number): v is string[] => Array.isArray(v) && v.every((x) => isKey(x, max));

export const validateDoc = (d: unknown): Doc => {
  const x = d as Partial<Doc> | null;
  const ok =
    typeof x === "object" &&
    x !== null &&
    isKey(x.id, MAX_LEN) &&
    isKey(x.path, MAX_LEN) &&
    isText(x.title) &&
    isText(x.body) &&
    isKeys(x.principals, MAX_PRINCIPAL) &&
    isKeys(x.links, MAX_LEN) &&
    typeof x.mtimeMs === "number" &&
    Number.isFinite(x.mtimeMs);
  if (!ok) throw new RankError("BAD_DOC", `invalid doc ${typeof x?.id === "string" ? JSON.stringify(x.id.slice(0, 40)) : ""}`.trim());
  return x as Doc;
};

/** Fail closed: anything but a non-empty list of sane principal strings is refused before the index is touched. */
export const validateRequest = (r: SearchRequest): { query: string; principals: string[]; k: number } => {
  const principals = r?.asker?.principals;
  if (!isKeys(principals, MAX_PRINCIPAL) || principals.length === 0 || principals.length > MAX_PRINCIPALS) {
    throw new RankError("BAD_ASKER", "asker.principals must be 1 to 256 non-empty strings of at most 256 characters");
  }
  if (typeof r.query !== "string") throw new RankError("BAD_QUERY", "query must be a string");
  const k = r.k ?? 10;
  if (!Number.isInteger(k) || k < 1 || k > 100) throw new RankError("BAD_QUERY", "k must be an integer from 1 to 100");
  return { query: r.query, principals, k };
};
