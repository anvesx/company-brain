import { edgeOps } from "./edges/edges.js";
import { reach } from "./edges/reach.js";
import { nodeOps, tx } from "./nodes.js";
import { scanOps } from "./scan/scan.js";
import { searchOps } from "./scan/search.js";
import { GraphError, type GraphStore, text, time } from "./schema.js";
import { openDb } from "./sqlite/open.js";

export { type AsyncGraphStore, toAsync } from "./async.js";
export { createPostgresGraphStore } from "./postgres/store.js";
export type { ScanPage, ScanQuery } from "./scan/scan.js";
export type { Edge, EdgeKind, GraphNode, GraphStore, NodeKind } from "./schema.js";
export { GraphError } from "./schema.js";
export { openDb } from "./sqlite/open.js";

/**
 * Opens (or creates) the graph in one SQLite file. Safe for several processes: writes are serialised
 * by SQLite write transactions. One handle is not shared across threads.
 */
export function createGraphStore(opts: { path: string }): GraphStore {
  const db = openDb(opts?.path);
  const nodes = nodeOps(db);
  const edges = edgeOps(db);
  const search = searchOps(db);
  const scan = scanOps(db);
  let open = true;
  const live =
    <A extends unknown[], R>(f: (...a: A) => R) =>
    (...a: A): R => {
      if (!open) throw new GraphError("CLOSED", "graph store is closed");
      return f(...a);
    };
  return {
    upsertNode: live(nodes.upsert),
    addEdge: live(edges.add),
    removeEdge: live(edges.remove),
    tombstone: live((tenant: string, id: string, at: number) => {
      const [t, i, w] = [text("tenant", tenant), text("id", id), time("at", at)];
      tx(db, () => {
        nodes.close(t, i, w);
        edges.closeAll(t, i, w);
      });
    }),
    node: live(nodes.get),
    neighbors: live(edges.neighbors),
    nodesOf: live(edges.nodesOf),
    edgesOf: live(edges.edgesOf),
    edgesBySource: live(edges.bySource),
    reach: live((tenant, from, o) => reach(tenant, from, o, edges)),
    history: live(nodes.history),
    searchTitles: live(search),
    scanTitles: live(scan),
    close: live(() => {
      open = false;
      db.close();
    }),
  };
}
