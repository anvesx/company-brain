import type pg from "pg";
import type { AsyncGraphStore } from "../async.js";
import { GraphError } from "../schema.js";
import { edgeOps } from "./edges.js";
import { manyOps } from "./many/many.js";
import { nodeOps } from "./nodes.js";
import { reach } from "./reach/reach.js";
import { migrate } from "./schema.js";

/**
 * Creates the tables if missing (under an advisory lock) and returns the store. Rejects if the database is
 * unreachable. The caller owns the pool: `close()` stops this store but never ends the pool, and the caller adds the
 * pool's `error` listener (a dropped idle connection emits `error`, which kills the process if nobody listens).
 */
export async function createPostgresGraphStore(opts: { pool: pg.Pool }): Promise<AsyncGraphStore> {
  const pool = opts.pool;
  await migrate(pool);
  const nodes = nodeOps(pool);
  const edges = edgeOps(pool);
  const many = manyOps(pool);
  let open = true;
  const live =
    <A extends unknown[], R>(f: (...a: A) => Promise<R>) =>
    async (...a: A): Promise<R> => {
      if (!open) throw new GraphError("CLOSED", "graph store is closed");
      return f(...a);
    };
  return {
    upsertNode: live(nodes.upsert),
    addEdge: live(edges.add),
    removeEdge: live(edges.remove),
    tombstone: live(nodes.tombstone),
    node: live(nodes.get),
    neighbors: live(edges.neighbors),
    nodesOf: live(many.nodesOf),
    edgesOf: live(many.edgesOf),
    edgesBySource: live(edges.bySource),
    reach: live((tenant, from, o) => reach(pool, tenant, from, o)),
    history: live(nodes.history),
    close: live(async () => {
      open = false;
    }),
  };
}
