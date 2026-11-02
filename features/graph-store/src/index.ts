import { DatabaseSync } from "node:sqlite";
import { edgeOps } from "./edges/edges.js";
import { reach } from "./edges/reach.js";
import { nodeOps, tx } from "./nodes.js";
import { bad, GraphError, type GraphStore, text, time } from "./schema.js";

export type { Edge, EdgeKind, GraphNode, GraphStore, NodeKind } from "./schema.js";
export { GraphError } from "./schema.js";

const DDL = `
CREATE TABLE IF NOT EXISTS nodes (tenant TEXT NOT NULL, id TEXT NOT NULL, kind TEXT NOT NULL, source TEXT NOT NULL, address TEXT NOT NULL,
  title TEXT NOT NULL, version TEXT NOT NULL, props TEXT NOT NULL, valid_from REAL NOT NULL, valid_to REAL);
CREATE UNIQUE INDEX IF NOT EXISTS nodes_current ON nodes (tenant, id) WHERE valid_to IS NULL;
CREATE INDEX IF NOT EXISTS nodes_history ON nodes (tenant, id, valid_from);
CREATE TABLE IF NOT EXISTS edges (tenant TEXT NOT NULL, from_id TEXT NOT NULL, to_id TEXT NOT NULL, kind TEXT NOT NULL, source TEXT NOT NULL,
  valid_from REAL NOT NULL, valid_to REAL);
CREATE UNIQUE INDEX IF NOT EXISTS edges_current ON edges (tenant, from_id, to_id, kind) WHERE valid_to IS NULL;
CREATE INDEX IF NOT EXISTS edges_out ON edges (tenant, from_id, kind);
CREATE INDEX IF NOT EXISTS edges_in ON edges (tenant, to_id, kind);`;

function openDb(path: string): DatabaseSync {
  text("path", path);
  const testing = process.env["NODE_ENV"] === "test" || process.env["VITEST"] !== undefined;
  if (path === ":memory:" && !testing) bad(":memory: is only allowed in tests");
  const db = new DatabaseSync(path);
  db.exec("PRAGMA busy_timeout = 10000");
  // Switching to WAL while another process does the same fails at once with SQLITE_BUSY: the busy
  // handler is not consulted. Retry that race a bounded number of times, then give up loudly.
  for (let attempt = 0; ; attempt++) {
    try {
      db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;");
      db.exec(DDL);
      return db;
    } catch (e) {
      if (attempt >= 200 || (e as { errcode?: number }).errcode !== 5) {
        db.close();
        throw e;
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
    }
  }
}

/**
 * Opens (or creates) the graph in one SQLite file. Safe for several processes: writes are serialised
 * by SQLite write transactions. One handle is not shared across threads.
 */
export function createGraphStore(opts: { path: string }): GraphStore {
  const db = openDb(opts?.path);
  const nodes = nodeOps(db);
  const edges = edgeOps(db);
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
    edgesBySource: live(edges.bySource),
    reach: live((tenant, from, o) => reach(tenant, from, o, edges.outTargets, nodes.get)),
    history: live(nodes.history),
    close: live(() => {
      open = false;
      db.close();
    }),
  };
}
