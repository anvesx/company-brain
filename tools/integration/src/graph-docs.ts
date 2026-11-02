import type { GraphStore } from "@anvesx/graph-store";

/** One document as the graph holds it, in the shape the rag repo's reindex service takes (`SourceDoc`). */
export type SourceDoc = {
  id: string;
  title: string;
  address: string;
  version: string;
  updatedAt?: string;
  /** Principals with a `can-read` edge to the document, sorted. */
  readers: readonly string[];
};

/** Documents of one connector that are current in the graph: the `belongs-to` in-edges of its project node. */
export function graphDocs(store: GraphStore, tenant: string, connectorId: string) {
  const edges = store.neighbors(tenant, `connector:${connectorId}`, { kind: "belongs-to", dir: "in" });
  return edges.flatMap((e) => {
    const node = store.node(tenant, e.from);
    return node === undefined ? [] : [node];
  });
}

/** The listing the rag repo indexes from: each current document with its source version and sorted readers. */
export function sourceDocs(store: GraphStore, tenant: string, connectorId: string): SourceDoc[] {
  return graphDocs(store, tenant, connectorId).map((n) => {
    const readers = store
      .neighbors(tenant, n.id, { kind: "can-read", dir: "in" })
      .map((e) => e.from)
      .sort();
    const updatedAt = n.props["updatedAt"];
    return { id: n.id, title: n.title, address: n.address, version: n.version, ...(updatedAt === undefined ? {} : { updatedAt }), readers };
  });
}
