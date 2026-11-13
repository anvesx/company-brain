import { type Cursor, decode } from "./cursor.js";

export type Sort = "modified" | "title" | "size";
export type Filters = {
  q?: string;
  source?: string;
  mime?: string;
  owner?: string;
  from?: string;
  to?: string;
  clusters?: string[];
  walk?: boolean;
  byReader?: boolean;
};
export type ListQuery = Filters & { sort: Sort; dir: "asc" | "desc"; limit: number; cursor?: string };

/** The sort expression of each order; each has a matching fv_doc_* index. */
export const KEY: Record<Sort, string> = {
  modified: "COALESCE(fv_ts(n.props, 'modified'), 0)",
  title: `(n.title COLLATE "C")`,
  size: "fv_num(n.props, 'size')",
};
const CAST: Record<Sort, string> = { modified: "bigint", title: "text", size: "bigint" };
const isAscii = (s: string): boolean => [...s].every((ch) => (ch.codePointAt(0) ?? 0) < 128);
const literal = (s: string): string => s.replace(/[\\%_]/g, "\\$&");
export const orderOf = (q: Pick<ListQuery, "sort" | "dir">): string => `${q.sort}:${q.dir}`;
const MEMBER = "m.tenant = n.tenant AND m.from_id = n.id AND m.kind = 'belongs-to' AND m.valid_to IS NULL";
const READER = "r.tenant = n.tenant AND r.to_id = n.id AND r.kind = 'can-read' AND r.valid_to IS NULL";

/**
 * The one SQL text for file listing: tenant-scoped current documents, optional filters, a keyset condition (never a row offset),
 * and a cheap can-read prefilter by the viewer's principals. The prefilter only narrows candidates; the gate decides.
 */
export function listSql(tenant: string, principals: string[], q: ListQuery, take: number, after?: Cursor): { sql: string; args: unknown[] } {
  const args: unknown[] = [tenant];
  const p = (v: unknown): string => `$${args.push(v)}`;
  const w = ["n.tenant = $1", "n.kind = 'document'", "n.valid_to IS NULL"];
  // A correlated scalar probe, not EXISTS: it cannot become a hash semi-join, so the planner keeps the ordered index scan (no sort of the readable set).
  // byReader (a small ACL): drive from the viewer's readable ids, a set small enough to sort, instead of walking the whole sort index.
  if (q.byReader)
    w.push(
      `n.id IN (SELECT r.to_id FROM edges r WHERE r.tenant = $1 AND r.kind = 'can-read' AND r.valid_to IS NULL AND r.from_id = ANY(${p(principals)}::text[]))`,
    );
  else w.push(`(SELECT 1 FROM edges r WHERE ${READER} AND r.from_id = ANY(${p(principals)}::text[]) LIMIT 1) IS NOT NULL`);
  if (q.q && isAscii(q.q))
    w.push(`n.title COLLATE "C" ILIKE ${p(`%${literal(q.q)}%`)}`); // trigram-indexed
  else if (q.q) w.push(`lower(n.title COLLATE "und-x-icu") LIKE lower(${p(`%${literal(q.q)}%`)}::text COLLATE "und-x-icu")`); // full Unicode case folding
  if (q.source) w.push(`n.source = ${p(q.source)}`);
  if (q.mime) w.push(`fv_prop(n.props, 'mime') = ${p(q.mime)}`);
  if (q.owner) w.push(`fv_prop(n.props, 'owner') = ${p(q.owner)}`);
  if (q.from || q.to) w.push("fv_ts(n.props, 'modified') IS NOT NULL"); // an undated file sorts as 0 but is never inside a range
  if (q.from) w.push(`${KEY.modified} >= ${p(Date.parse(q.from))}::bigint`); // instants, same expression as the index
  if (q.to) w.push(`${KEY.modified} <= ${p(Date.parse(q.to))}::bigint`);
  // walk: many member rows, so read the sort index in order and probe membership per row (scalar probe); else read members first and sort them.
  const member = (): string => `SELECT 1 FROM edges m WHERE ${MEMBER} AND m.to_id = ANY(${p(q.clusters ?? [])}::text[])`;
  if (q.clusters) w.push(q.walk ? `(${member()} LIMIT 1) IS NOT NULL` : `EXISTS (${member()})`);
  const op = q.dir === "asc" ? ">" : "<";
  if (after) w.push(`(${KEY[q.sort]}, n.id) ${op} (${p(after.k)}::${CAST[q.sort]}, ${p(after.i)}::text)`);
  const o = q.dir.toUpperCase();
  const key = KEY[q.sort];
  const sql = `SELECT n.id, n.title, n.source, n.props, ${key}::text AS k FROM nodes n WHERE ${w.join(" AND ")} ORDER BY ${key} ${o}, n.id ${o} LIMIT ${p(take)}`;
  return { sql, args };
}

export const cursorOf = (q: ListQuery): Cursor | undefined => (q.cursor ? decode(q.cursor, orderOf(q)) : undefined);
