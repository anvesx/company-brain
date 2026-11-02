import type { EdgeKind, GraphNode, GraphStore } from "../../src/index.js";

/** The original reach: one neighbors() and one node() lookup per node, no budget. */
export function oracle(s: GraphStore, from: string, o: { kinds: EdgeKind[]; depth: number; limit: number }): GraphNode[] {
  const out: GraphNode[] = [];
  if (o.limit === 0 || o.depth === 0 || o.kinds.length === 0) return out;
  const seen = new Set([from]);
  let frontier = [from];
  for (let level = 0; level < o.depth && frontier.length > 0; level++) {
    const upcoming: string[] = [];
    for (const id of frontier) {
      for (const e of s.neighbors("t1", id, { dir: "out" })) {
        if (!o.kinds.includes(e.kind) || seen.has(e.to)) continue;
        seen.add(e.to);
        const n = s.node("t1", e.to);
        if (n === undefined) continue;
        out.push(n);
        if (out.length >= o.limit) return out;
        upcoming.push(e.to);
      }
    }
    frontier = upcoming;
  }
  return out;
}
