import type { DatabaseSync } from "node:sqlite";
import { toNode } from "../nodes.js";
import type { GraphNode } from "../schema.js";

/** Ids per IN list: well under SQLite's bound-variable limit. */
const CHUNK = 500;
const VALID = "valid_from <= ? AND (valid_to IS NULL OR ? < valid_to)";
const marks = (n: number): string => Array.from({ length: n }, () => "?").join(", ");

export interface Batch {
  /** Target ids of current out-edges of `ids` (kinds, as of `when`): frontier order, then insertion. At most `max` rows. */
  outTargets(tenant: string, ids: string[], kinds: string[], when: number, max: number): string[];
  /** The nodes among `ids` that exist at `when`, keyed by id. One read per CHUNK ids. */
  nodes(tenant: string, ids: string[], when: number): Map<string, GraphNode>;
}

export function batchOps(db: DatabaseSync): Batch {
  return {
    outTargets(t, ids, kinds, when, max) {
      const out: string[] = [];
      for (let i = 0; i < ids.length && out.length < max; i += CHUNK) {
        const part = ids.slice(i, i + CHUNK);
        const sql = `SELECT from_id, to_id FROM edges WHERE tenant = ? AND from_id IN (${marks(part.length)}) AND kind IN (${marks(kinds.length)}) AND ${VALID} ORDER BY rowid LIMIT ?`;
        const rows = db.prepare(sql).all(t, ...part, ...kinds, when, when, max - out.length);
        const rank = new Map(part.map((id, k) => [id, k]));
        rows.sort((a, b) => rank.get(a["from_id"] as string)! - rank.get(b["from_id"] as string)!);
        for (const r of rows) out.push(r["to_id"] as string);
      }
      return out;
    },
    nodes(t, ids, when) {
      const found = new Map<string, GraphNode>();
      for (let i = 0; i < ids.length; i += CHUNK) {
        const part = ids.slice(i, i + CHUNK);
        const sql = `SELECT * FROM nodes WHERE tenant = ? AND id IN (${marks(part.length)}) AND ${VALID}`;
        for (const r of db.prepare(sql).all(t, ...part, when, when)) found.set(r["id"] as string, toNode(r));
      }
      return found;
    },
  };
}
