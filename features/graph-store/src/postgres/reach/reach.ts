import type pg from "pg";
import { toNode } from "../../nodes.js";
import { bad, EDGE_KINDS, type EdgeKind, GraphError, type GraphNode, MAX_DEPTH, NOW, oneOf, text, time } from "../../schema.js";

// Edges leaving the frontier, in frontier order then insertion order (the same order SQLite returns).
const NEXT = `SELECT e.to_id FROM unnest($2::text[]) WITH ORDINALITY AS f(id, r) JOIN edges e ON e.tenant = $1 AND e.from_id = f.id
  WHERE e.kind = ANY($3::text[]) AND e.valid_from <= $4 AND (e.valid_to IS NULL OR $4 < e.valid_to) ORDER BY f.r, e.seq`;
const NODES = "SELECT * FROM nodes WHERE tenant = $1 AND id = ANY($2::text[]) AND valid_from <= $3 AND (valid_to IS NULL OR $3 < valid_to)";

/**
 * Breadth-first walk over outgoing edges, same rules as the SQLite version: never returns the start node,
 * skips (and does not expand) nodes missing at `asOf`, stops at `limit`. Two queries per level, not per node.
 */
export async function reach(
  pool: pg.Pool,
  tenant: string,
  from: string,
  o: { kinds: EdgeKind[]; depth: number; limit: number; asOf?: number },
): Promise<GraphNode[]> {
  const t = text("tenant", tenant),
    start = text("from", from);
  if (!Array.isArray(o?.kinds)) bad("kinds must be an array");
  for (const k of o.kinds) oneOf("kind", k, EDGE_KINDS);
  if (!Number.isInteger(o.depth) || o.depth < 0) bad("depth must be a non-negative integer");
  if (o.depth > MAX_DEPTH) throw new GraphError("DEPTH_LIMIT", `depth is capped at ${MAX_DEPTH}`);
  if (!Number.isInteger(o.limit) || o.limit < 0) bad("limit must be a non-negative integer");
  const when = o.asOf === undefined ? NOW : time("asOf", o.asOf);
  const out: GraphNode[] = [];
  if (o.limit === 0 || o.depth === 0 || o.kinds.length === 0) return out;
  const kinds = [...new Set(o.kinds)];
  const seen = new Set([start]);
  let frontier = [start];
  for (let level = 0; level < o.depth && frontier.length > 0; level++) {
    const edges = await pool.query(NEXT, [t, frontier, kinds, when]);
    const fresh = edges.rows.map((r) => r.to_id as string).filter((to) => !seen.has(to) && seen.add(to));
    if (fresh.length === 0) break;
    const found = new Map((await pool.query(NODES, [t, fresh, when])).rows.map((r) => [r.id as string, toNode(r)]));
    frontier = [];
    for (const id of fresh) {
      const n = found.get(id);
      if (n === undefined) continue;
      out.push(n);
      if (out.length >= o.limit) return out;
      frontier.push(id);
    }
  }
  return out;
}
