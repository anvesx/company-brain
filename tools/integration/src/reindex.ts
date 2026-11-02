import { createHash } from "node:crypto";
import { diffListing, type ListingDiff } from "@anvesx/change-cursor";
import type { Connector } from "@anvesx/connector-kit";
import type { GraphStore } from "@anvesx/graph-store";
import type { Doc, RankIndex } from "@anvesx/rank";

/** Narrows a document's readers. `tag` names what the gate decides on (such as the zone), so a change in it reindexes. */
export type Gate = ((doc: Doc) => Doc) & { tag?: (path: string) => string };
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

/** Rank refuses more than 10,000 documents per call, so a first reindex of a big corpus goes in slices. */
const BATCH = 5000;
const chunks = <T>(all: readonly T[]): T[][] => Array.from({ length: Math.ceil(all.length / BATCH) }, (_, i) => all.slice(i * BATCH, (i + 1) * BATCH));

/** Brings the rank index in line with the graph: index created and updated documents, then drop deleted ones. */
export async function reindex(d: ReindexDeps): Promise<ListingDiff> {
  const nodes = new Map(graphDocs(d.store, d.tenant, d.connector.id).map((n) => [n.id, n]));
  const readersOf = (id: string) =>
    d.store
      .neighbors(d.tenant, id, { kind: "can-read", dir: "in" })
      .map((e) => e.from)
      .sort();
  // The reader set is part of the tag, so an ACL change that leaves the source version alone still reindexes.
  const readers = new Map([...nodes.keys()].map((id) => [id, readersOf(id)]));
  const tag = (n: { id: string; address: string; version: string }) => {
    const acl = createHash("sha256")
      .update(JSON.stringify(readers.get(n.id)))
      .digest("hex")
      .slice(0, 16);
    return [n.version, d.gate?.tag?.(n.address), acl].filter((p) => p !== undefined).join("|");
  };
  const versions = new Map([...nodes].map(([id, n]) => [id, tag(n)]));
  const diff = diffListing(d.known, versions);
  const docs: Doc[] = [];
  for (const id of [...diff.created, ...diff.updated]) {
    const n = nodes.get(id);
    if (n === undefined) continue;
    const { text } = await d.connector.fetch(n.address, { token: "integration" });
    const mtime = Date.parse(n.props["updatedAt"] ?? "");
    const doc = {
      id,
      title: n.title,
      path: n.address,
      body: text,
      principals: readers.get(id) ?? [],
      mtimeMs: Number.isFinite(mtime) ? mtime : 0,
      links: [],
    };
    docs.push(d.gate ? d.gate(doc) : doc);
  }
  // `known` changes only after both index steps committed, so a throw leaves the whole pass to retry.
  for (const part of chunks(docs)) d.index.index(part);
  for (const part of chunks(diff.deleted)) d.index.remove(part);
  for (const doc of docs) d.known.set(doc.id, versions.get(doc.id) as string);
  for (const id of diff.deleted) d.known.delete(id);
  return diff;
}
