import { bad, EDGE_KINDS, type EdgeKind, GraphError, type GraphNode, MAX_DEPTH, NOW, oneOf, text, time } from "../schema.js";
import type { Batch } from "./batch.js";

export interface ReachOpts {
  kinds: EdgeKind[];
  depth: number;
  limit: number;
  asOf?: number;
}

/**
 * Breadth-first walk over outgoing edges of the given kinds. Returns reached nodes (never the start
 * node) level by level, then in edge insertion order. A node that does not exist at `asOf` is skipped
 * and not expanded. Returns exactly min(limit, reachable) nodes. Edges are read in growing pages, one
 * edge query and one node query per page, and reading stops as soon as `limit` nodes are found, so
 * cost follows the edges scanned (ghost edges included) until then, not a fixed cap.
 */
export function reach(tenant: string, from: string, o: ReachOpts, q: Batch): GraphNode[] {
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
    const upcoming: string[] = [];
    for (const page of q.pages(t, frontier, kinds, when)) {
      const fresh = page.filter((to) => !seen.has(to) && seen.add(to));
      const found = q.nodes(t, fresh, when);
      for (const to of fresh) {
        const n = found.get(to);
        if (n === undefined) continue;
        out.push(n);
        if (out.length >= o.limit) return out;
        upcoming.push(to);
      }
    }
    frontier = upcoming;
  }
  return out;
}
