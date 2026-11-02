import type { ListedDoc } from "@anvesx/connector-kit";
import type { GraphNode } from "@anvesx/graph-store";
import { type SyncDeps, SyncError, type SyncReport } from "../types.js";

export interface Ctx {
  deps: SyncDeps;
  report: SyncReport;
  /** Throws SUPERSEDED when a newer run of this connector has started. Called after every await, before writing. */
  alive: () => void;
  /** Principal ids written or found in this run, with their kind. */
  principals: Map<string, string>;
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

/** Graph id of a document: the connector id in front of the address, unless the caller already did that. */
export const nodeId = (c: Ctx, address: string): string => {
  const prefix = `${c.deps.connector.id}/`;
  return address.startsWith(prefix) ? address : prefix + address;
};

/** One listed document: its node (metadata only, never text) and its `belongs-to` edge. */
export const syncDocument = (c: Ctx, d: ListedDoc): void => {
  const { store, connector, tenant, now } = c.deps;
  const id = nodeId(c, d.address);
  const old = store.node(tenant, id);
  if (old !== undefined && old.source !== connector.id) throw new SyncError("BAD_INPUT", `${id} belongs to source ${old.source}`);
  if (old !== undefined && old.kind !== "document") throw new SyncError("BAD_INPUT", `${id} is already a ${old.kind}, not a document`);
  writeNode(c, {
    tenant,
    id,
    kind: "document",
    source: connector.id,
    address: d.address,
    title: d.title,
    version: d.version,
    props: { zone: d.zone, updatedAt: d.updatedAt },
  });
  const linked = store.neighbors(tenant, id, { kind: "belongs-to", dir: "out" });
  if (linked.some((e) => e.to === c.root)) return;
  store.addEdge({ tenant, from: id, to: c.root, kind: "belongs-to", source: connector.id }, now());
  c.report.edges++;
};
