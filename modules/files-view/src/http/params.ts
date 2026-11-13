import { BadInput } from "../db/cursor.js";
import type { ListQuery, Sort } from "../db/list.js";

export const MAX_LIMIT = 100;
export const MAX_Q = 100;
const FIELDS = ["q", "source", "mime", "owner", "from", "to", "cluster"] as const;
const KEYS = new Set<string>([...FIELDS, "sort", "dir", "limit", "cursor", "parent", "after"]);
const SORTS: Sort[] = ["modified", "title", "size"];

/** Reads one query string strictly: unknown names, repeated names, control characters and oversize values are all BadInput (HTTP 400). */
export function strict(u: URLSearchParams, allowed: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of u) {
    if (!KEYS.has(k) || !allowed.includes(k) || k in out) throw new BadInput(`bad parameter ${k}`);
    // biome-ignore lint/suspicious/noControlCharactersInRegex: rejecting control characters is the point
    if (/[\u0000-\u001f\u007f]/.test(v) || v.length > (k === "q" ? MAX_Q : k === "cursor" ? 1024 : 200)) throw new BadInput(`bad value for ${k}`);
    if (v !== "") out[k] = v;
  }
  return out;
}

export function pageSize(raw: string | undefined): number {
  if (raw === undefined) return 25;
  if (!/^[0-9]{1,6}$/.test(raw) || Number(raw) < 1) throw new BadInput("bad limit");
  return Math.min(Number(raw), MAX_LIMIT);
}

/**
 * A date (YYYY-MM-DD, whole day) or ISO instant with a zone, as a millisecond-precision UTC ISO instant, so ranges compare as instants and never as text.
 * `end` makes the bound inclusive of the whole second (or day) it names. Anything else is BadInput.
 */
export function instant(raw: string, end: boolean): string {
  const day = /^\d{4}-\d{2}-\d{2}$/.test(raw);
  const full = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(raw);
  const ms = Date.parse(day ? `${raw}T00:00:00.000Z` : raw);
  if ((!day && !full) || Number.isNaN(ms)) throw new BadInput("bad date");
  if (day && new Date(ms).toISOString().slice(0, 10) !== raw) throw new BadInput("bad date");
  const whole = day ? 86_400_000 : /\.\d/.test(raw) ? 1 : 1000;
  return new Date(end ? ms + whole - 1 : ms).toISOString();
}

/** Files-list parameters: filters, sort, direction, page size and cursor. `cluster` is returned apart, as an id to expand. */
export function parseList(p: Record<string, string>): { query: ListQuery; cluster?: string } {
  const sort = (p["sort"] ?? "modified") as Sort;
  const dir = p["dir"] ?? (sort === "title" ? "asc" : "desc");
  if (!SORTS.includes(sort) || (dir !== "asc" && dir !== "desc")) throw new BadInput("bad sort");
  const query: ListQuery = { sort, dir, limit: pageSize(p["limit"]) };
  for (const f of ["q", "source", "mime", "owner", "cursor"] as const) if (p[f] !== undefined) query[f] = p[f];
  if (p["from"] !== undefined) query.from = instant(p["from"], false);
  if (p["to"] !== undefined) query.to = instant(p["to"], true);
  return { query, ...(p["cluster"] && { cluster: p["cluster"] }) };
}

export const LIST_KEYS = [...FIELDS, "sort", "dir", "limit", "cursor"];
export const CLUSTER_KEYS = LIST_KEYS.filter((k) => k !== "cluster");
// biome-ignore lint/suspicious/noControlCharactersInRegex: rejecting control characters is the point
export const SAFE_ID = /^[^\u0000-\u001f\u007f]{1,512}$/u;
