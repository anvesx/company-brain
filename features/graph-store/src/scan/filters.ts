import { bad, EDGE_KINDS, type EdgeKind, NODE_KINDS, NOW, type NodeKind, oneOf, text, time } from "../schema.js";
import { checkNeedle } from "../validation/query.js";

export interface TitleFilter {
  text: string;
  kinds?: NodeKind[];
  asOf?: number;
  /**
   * Only nodes that one of `from` points to with an edge of `kind`, current at the same time.
   * With `only`, the rule covers nodes of that kind alone and every other kind passes.
   */
  reachedBy?: { from: string[]; kind: EdgeKind; only?: NodeKind };
}

/** Makes `%`, `_` and `\` literal inside a LIKE pattern (the query uses ESCAPE '\'). */
const literal = (s: string): string => s.replace(/[\\%_]/g, "\\$&");

/** The needle and the WHERE terms (alias `n`) shared by every title query: tenant, time, LIKE, kinds, reachedBy. */
export function titleFilter(tenant: string, q: TitleFilter) {
  const t = text("tenant", tenant);
  const needle = checkNeedle(q?.text);
  const when = q.asOf === undefined ? NOW : time("asOf", q.asOf);
  // LIKE is case-insensitive for ASCII only, which is the rule we want.
  let where = "n.tenant = ? AND n.valid_from <= ? AND (n.valid_to IS NULL OR ? < n.valid_to) AND n.title LIKE ? ESCAPE '\\'";
  const like = `%${literal(needle)}%`;
  const args: (string | number)[] = [t, when, when, like];
  if (q.kinds !== undefined) {
    if (!Array.isArray(q.kinds)) bad("kinds must be a list");
    const kinds = q.kinds.map((k) => oneOf("kind", k, NODE_KINDS));
    where += ` AND n.kind IN (${kinds.map(() => "?").join(",")})`;
    args.push(...kinds);
  }
  if (q.reachedBy !== undefined) {
    const { from, kind, only } = q.reachedBy;
    if (!Array.isArray(from) || from.length === 0 || from.length > 1000) bad("reachedBy.from must list 1 to 1000 ids");
    const ids = from.map((f) => text("reachedBy.from", f));
    // One probe of the edges_in index per candidate; the planner picks it without a hint (see the plan test).
    const skip = only === undefined ? "" : "n.kind <> ? OR ";
    where += ` AND (${skip}EXISTS (SELECT 1 FROM edges WHERE tenant = ? AND to_id = n.id AND kind = ?`;
    where += ` AND from_id IN (${ids.map(() => "?").join(",")}) AND valid_from <= ? AND (valid_to IS NULL OR ? < valid_to)))`;
    if (only !== undefined) args.push(oneOf("reachedBy.only", only, NODE_KINDS));
    args.push(t, oneOf("reachedBy.kind", kind, EDGE_KINDS), ...ids, when, when);
  }
  // The FTS5 phrase for the needle: quoted so operators in the text are plain characters.
  return { tenant: t, needle, like, match: `"${needle.replaceAll('"', '""')}"`, where, args };
}
