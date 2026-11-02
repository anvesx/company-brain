import type { ListedDoc } from "@anvesx/connector-kit";
import type { GraphNode } from "@anvesx/graph-store";
import type { SyncDeps, SyncReport } from "./types.js";

export interface Ctx {
  deps: SyncDeps;
  report: SyncReport;
  /** Principal ids already written in this run. */
  principals: Set<string>;
  /** Id of the node every document of this connector belongs to. */
  root: string;
}

const same = (a: GraphNode, b: GraphNode): boolean => {
  const [pa, pb] = [Object.entries(a.props), b.props];
  return (
    a.kind === b.kind &&
    a.source === b.source &&
    a.address === b.address &&
    a.title === b.title &&
    a.version === b.version &&
    pa.length === Object.keys(pb).length &&
    pa.every(([k, v]) => pb[k] === v)
  );
};

/** Writes the node only when the graph does not already hold exactly this content. */
export const writeNode = (c: Ctx, n: GraphNode): void => {
  const old = c.deps.store.node(n.tenant, n.id);
  if (old !== undefined && same(old, n)) return;
  c.deps.store.upsertNode(n, c.deps.now());
  c.report.nodes++;
};

export const rootNode = (c: Ctx): GraphNode => ({
  tenant: c.deps.tenant,
  id: c.root,
  kind: "project",
  source: c.deps.connector.id,
  address: c.root,
  title: c.deps.connector.id,
  version: "",
  props: {},
});

/** One listed document: its node (metadata only, never text) and its `belongs-to` edge. */
export const syncDocument = (c: Ctx, d: ListedDoc): void => {
  const { store, connector, tenant, now } = c.deps;
  writeNode(c, {
    tenant,
    id: d.address,
    kind: "document",
    source: connector.id,
    address: d.address,
    title: d.title,
    version: d.version,
    props: { zone: d.zone, updatedAt: d.updatedAt },
  });
  const linked = store.neighbors(tenant, d.address, { kind: "belongs-to", dir: "out" });
  if (linked.some((e) => e.to === c.root)) return;
  store.addEdge({ tenant, from: d.address, to: c.root, kind: "belongs-to", source: connector.id }, now());
  c.report.edges++;
};
