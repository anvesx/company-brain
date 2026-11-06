import type { GraphNode } from "@anvesx/graph-store";

/** Each connector is its own cluster of documents; every other kind (person, team, ...) is one cluster. */
export const groupOf = (n: Pick<GraphNode, "kind" | "source">): string => (n.kind === "document" ? `document:${n.source}` : n.kind);

/** How many visible nodes each group holds, sorted by group name. Totals for the whole view, never one page. */
export function categoriesOf(nodes: readonly Pick<GraphNode, "kind" | "source">[]): { group: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const n of nodes) counts.set(groupOf(n), (counts.get(groupOf(n)) ?? 0) + 1);
  return [...counts].sort(([a], [b]) => (a < b ? -1 : 1)).map(([group, count]) => ({ group, count }));
}
