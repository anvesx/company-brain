import type { Connector, ListedDoc } from "@brain/connector-kit";
import type { GraphNode, GraphStore } from "@brain/graph-store";

/** Every listed document carries the account's data zone. Account zones (private, personal, company) are stored as given, not mapped. */
export const withZone = (c: Connector, zone: string): Connector => ({
  ...c,
  list: async (q) => {
    const page = await c.list(q);
    return { ...page, items: page.items.map((d) => ({ ...d, zone: zone as ListedDoc["zone"] })) };
  },
});

const bare = (n: GraphNode | undefined): GraphNode | undefined => {
  if (n === undefined || n.kind !== "document") return n;
  const props = { ...n.props };
  delete props["owner"];
  return { ...n, props };
};

/**
 * The real graph store, with the account's owner added to each document node on write.
 * Reads hide the owner so graph-sync's "unchanged" check still sees equal nodes and a re-run writes nothing.
 */
export const withOwner = (g: GraphStore, owner: string): GraphStore => ({
  ...g,
  upsertNode: (n, at) => g.upsertNode(n.kind === "document" ? { ...n, props: { ...n.props, owner } } : n, at),
  node: (...a) => bare(g.node(...a)),
});
