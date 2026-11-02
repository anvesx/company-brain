import { bad, EDGE_KINDS, type EdgeKind, GraphError, type GraphNode, MAX_DEPTH, NOW, oneOf, text, time } from "../schema.js";

export interface ReachOpts {
  kinds: EdgeKind[];
  depth: number;
  limit: number;
  asOf?: number;
}
type Targets = (tenant: string, id: string, when: number) => string[];

/**
 * Breadth-first walk over outgoing edges of the given kinds. Returns reached nodes (never the start
 * node) level by level, then in edge insertion order. A node that does not exist at `asOf` is skipped
 * and not expanded. Cost is bounded by the visited set, which `limit` caps at the result size.
 */
export function reach(
  tenant: string,
  from: string,
  o: ReachOpts,
  targets: (kinds: readonly string[]) => Targets,
  get: (tenant: string, id: string, asOf: number) => GraphNode | undefined,
): GraphNode[] {
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
  const next = targets(o.kinds);
  const seen = new Set([start]);
  let frontier = [start];
  for (let level = 0; level < o.depth && frontier.length > 0; level++) {
    const upcoming: string[] = [];
    for (const id of frontier) {
      for (const to of next(t, id, when)) {
        if (seen.has(to)) continue;
        seen.add(to);
        const n = get(t, to, when);
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
