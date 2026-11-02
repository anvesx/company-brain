import { diffListing, type ListingDiff } from "@anvesx/change-cursor";
import type { Connector } from "@anvesx/connector-kit";
import type { GraphStore } from "@anvesx/graph-store";
import type { Doc, RankIndex } from "@anvesx/rank";

export type Gate = (doc: Doc) => Doc;
export type ReindexDeps = {
  store: GraphStore;
  connector: Connector;
  tenant: string;
  index: RankIndex;
  /** id to version of what the index holds now; updated in place. */
  known: Map<string, string>;
  gate?: Gate;
};

/** Documents of one connector that are current in the graph: the `belongs-to` in-edges of its project node. */
export function graphDocs(store: GraphStore, tenant: string, connectorId: string) {
  const edges = store.neighbors(tenant, `connector:${connectorId}`, { kind: "belongs-to", dir: "in" });
  return edges.flatMap((e) => {
    const node = store.node(tenant, e.from);
    return node === undefined ? [] : [node];
  });
}

/** Brings the rank index in line with the graph: index created and updated documents, drop deleted ones. */
export async function reindex(d: ReindexDeps): Promise<ListingDiff> {
  const nodes = new Map(graphDocs(d.store, d.tenant, d.connector.id).map((n) => [n.id, n]));
  const diff = diffListing(d.known, new Map([...nodes].map(([id, n]) => [id, n.version])));
  const docs: Doc[] = [];
  for (const id of [...diff.created, ...diff.updated]) {
    const n = nodes.get(id);
    if (n === undefined) continue;
    const { text } = await d.connector.fetch(n.address, { token: "integration" });
    const readers = d.store.neighbors(d.tenant, id, { kind: "can-read", dir: "in" });
    const doc = {
      id,
      title: n.title,
      path: n.address,
      body: text,
      principals: readers.map((e) => e.from),
      mtimeMs: Date.parse(n.props["updatedAt"] ?? ""),
      links: [],
    };
    docs.push(d.gate ? d.gate(doc) : doc);
    d.known.set(id, n.version);
  }
  d.index.index(docs);
  d.index.remove(diff.deleted);
  for (const id of diff.deleted) d.known.delete(id);
  return diff;
}
