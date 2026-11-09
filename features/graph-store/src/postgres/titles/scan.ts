import type pg from "pg";
import { toNode } from "../../nodes.js";
import type { ScanPage, ScanQuery } from "../../scan/scan.js";
import type { GraphNode } from "../../schema.js";
import { scanBounds } from "../../validation/query.js";
import { likeArg, likeTerm, pgTitleFilter } from "./filter.js";

const CHUNK = 256; // candidates verified per statement, as in SQLite
/** Step 1: candidate seq values. Exported so a test can EXPLAIN it. */
export const CANDIDATES = `SELECT seq FROM nodes WHERE tenant = $1 AND seq > $2 AND ${likeTerm("title", 3)} ORDER BY seq LIMIT $4`;

/**
 * `scanTitles` for Postgres, the same two steps as SQLite: candidate `seq` values in order (at most `cap`, any validity),
 * then each chunk of 256 is checked against the full filter and the JS `accept` predicate. `seq` plays the rowid.
 */
export function scanOps(pool: pg.Pool) {
  return async (tenant: string, q: ScanQuery): Promise<ScanPage> => {
    const { cap, after } = scanBounds(q); // shared with SQLite, so both refuse the same input before any SQL
    const f = pgTitleFilter(tenant, q, [[]]); // $1 is the chunk's seq list; the filter's own values follow
    const candidates = (await pool.query(CANDIDATES, [tenant, after, likeArg(f.needle), cap])).rows.map((r) => Number(r.seq));
    const [nodes, cursors]: [GraphNode[], number[]] = [[], []];
    for (let i = 0; i < candidates.length; i += CHUNK) {
      const args = [candidates.slice(i, i + CHUNK), ...f.args.slice(1)];
      const rows = (await pool.query(`SELECT n.*, n.seq AS rid FROM nodes n WHERE n.seq = ANY($1::bigint[]) AND ${f.where} ORDER BY n.seq`, args)).rows;
      for (const r of rows) {
        const n = toNode(r);
        if (q.accept && !q.accept(n)) continue;
        nodes.push(n);
        const rid = Number(r.rid);
        cursors.push(rid);
        // Candidates and rows are both in seq order, so the row's place in the list is how many were examined.
        if (nodes.length === q.limit) return { nodes, cursors, next: rid, truncated: false, examined: candidates.indexOf(rid, i) + 1 };
      }
    }
    const last = candidates[candidates.length - 1];
    const truncated = candidates.length === cap && last !== undefined;
    return { nodes, cursors, ...(truncated ? { next: last } : {}), truncated, examined: candidates.length };
  };
}
