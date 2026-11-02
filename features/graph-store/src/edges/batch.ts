import type { DatabaseSync } from "node:sqlite";
import { toNode } from "../nodes.js";
import type { GraphNode } from "../schema.js";

/** Frontier ids per edge query (two bound values each) and node ids per IN list; far below SQLite's variable limit. */
const EDGE_IDS = 200;
const NODE_IDS = 5000;
/** First page size and growth factor: reads grow with the log of the edges scanned, memory per page is capped. */
const FIRST_PAGE = 1000;
const MAX_PAGE = 50_000;
const VALID = "valid_from <= ? AND (valid_to IS NULL OR ? < valid_to)";
const marks = (n: number, one = "?"): string => Array.from({ length: n }, () => one).join(", ");

export interface Batch {
  /** Target ids of current out-edges of `ids`, in frontier order then insertion order, lazily one page per query. */
  pages(tenant: string, ids: string[], kinds: string[], when: number): Generator<string[]>;
  /** The nodes among `ids` that exist at `when`, keyed by id. One read per NODE_IDS ids. */
  nodes(tenant: string, ids: string[], when: number): Map<string, GraphNode>;
}

export function batchOps(db: DatabaseSync): Batch {
  return {
    *pages(t, ids, kinds, when) {
      for (let i = 0; i < ids.length; i += EDGE_IDS) {
        const part = ids.slice(i, i + EDGE_IDS);
        // CROSS JOIN + INDEXED BY pin the plan: left to itself SQLite scans edges_in over the whole tenant.
        const sql = `WITH f(id, r) AS (VALUES ${marks(part.length, "(?, ?)")})
          SELECT to_id, f.r AS r, e.rowid AS rid FROM f CROSS JOIN edges e INDEXED BY edges_out ON e.tenant = ? AND e.from_id = f.id
          WHERE kind IN (${marks(kinds.length)}) AND ${VALID} AND (f.r > ? OR (f.r = ? AND e.rowid > ?)) ORDER BY f.r, e.rowid LIMIT ?`;
        const q = db.prepare(sql);
        const args = part.flatMap((id, r) => [id, r]);
        let [r, rid, size] = [-1, -1, FIRST_PAGE];
        for (;;) {
          const rows = q.all(...args, t, ...kinds, when, when, r, r, rid, size);
          if (rows.length === 0) break;
          yield rows.map((x) => x["to_id"] as string);
          const last = rows[rows.length - 1]!;
          [r, rid] = [last["r"] as number, last["rid"] as number];
          if (rows.length < size) break;
          size = Math.min(size * 4, MAX_PAGE);
        }
      }
    },
    nodes(t, ids, when) {
      const found = new Map<string, GraphNode>();
      for (let i = 0; i < ids.length; i += NODE_IDS) {
        const part = ids.slice(i, i + NODE_IDS);
        const sql = `SELECT * FROM nodes WHERE tenant = ? AND id IN (${marks(part.length)}) AND ${VALID}`;
        for (const r of db.prepare(sql).all(t, ...part, when, when)) found.set(r["id"] as string, toNode(r));
      }
      return found;
    },
  };
}
