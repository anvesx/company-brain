import type { TitleFilter } from "../../scan/filters.js";
import { bad, EDGE_KINDS, NODE_KINDS, NOW, oneOf, text, time } from "../../schema.js";
import { checkNeedle } from "../../validation/query.js";

/** Makes `%`, `_` and `\` literal inside an ILIKE pattern (backslash is Postgres's default escape). */
const literal = (s: string): string => s.replace(/[\\%_]/g, "\\$&");

/** The LIKE term for a needle. COLLATE "C" keeps the fold to ASCII, like SQLite, whatever the database locale. */
export const likeTerm = (col: string, n: number): string => `${col} COLLATE "C" ILIKE $${n}`;
export const likeArg = (needle: string): string => `%${literal(needle)}%`;

/**
 * The needle, the WHERE terms (alias `n`) and the bound values shared by every Postgres title query: tenant, time,
 * ILIKE, kinds, reachedBy. `args` starts with `first`, so a caller can own the leading placeholders.
 */
export function pgTitleFilter(tenant: string, q: TitleFilter, first: unknown[] = []) {
  const t = text("tenant", tenant);
  const needle = checkNeedle(q?.text);
  const when = q.asOf === undefined ? NOW : time("asOf", q.asOf);
  const args: unknown[] = [...first];
  const p = (v: unknown): string => `$${args.push(v)}`;
  const [pt, pw] = [p(t), p(when)];
  let where = `n.tenant = ${pt} AND n.valid_from <= ${pw} AND (n.valid_to IS NULL OR ${pw} < n.valid_to) AND ${likeTerm("n.title", args.push(likeArg(needle)))}`;
  if (q.kinds !== undefined) {
    if (!Array.isArray(q.kinds)) bad("kinds must be a list");
    where += ` AND n.kind = ANY(${p(q.kinds.map((k) => oneOf("kind", k, NODE_KINDS)))}::text[])`;
  }
  if (q.reachedBy !== undefined) {
    const { from, kind, only } = q.reachedBy;
    if (!Array.isArray(from) || from.length === 0 || from.length > 1000) bad("reachedBy.from must list 1 to 1000 ids");
    const ids = from.map((f) => text("reachedBy.from", f));
    const skip = only === undefined ? "" : `n.kind <> ${p(oneOf("reachedBy.only", only, NODE_KINDS))} OR `;
    where += ` AND (${skip}EXISTS (SELECT 1 FROM edges WHERE tenant = ${pt} AND to_id = n.id AND kind = ${p(oneOf("reachedBy.kind", kind, EDGE_KINDS))}`;
    where += ` AND from_id = ANY(${p(ids)}::text[]) AND valid_from <= ${pw} AND (valid_to IS NULL OR ${pw} < valid_to)))`;
  }
  return { needle, where, args };
}
