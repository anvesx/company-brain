import type { DatabaseSync } from "node:sqlite";
import { toNode } from "../nodes.js";
import type { GraphNode } from "../schema.js";
import { scanBounds } from "../validation/query.js";
import { type TitleFilter, titleFilter } from "./filters.js";

export interface ScanQuery extends TitleFilter {
  limit: number;
  /** The `next` of the previous page: continue after this row. */
  cursor?: number;
  /** Most candidate titles to look at in this call (default 4096). Bounds the time of one call. */
  cap?: number;
  /** A last check run in JS on each row the SQL accepted, for rules SQL cannot express. */
  accept?: (n: GraphNode) => boolean;
}
export interface ScanPage {
  nodes: GraphNode[];
  /** Pass back as `cursor` to continue. Absent when the search is complete. */
  next?: number;
  /** True when `cap` candidates were examined without filling `limit`: the page is partial, `next` continues. */
  truncated: boolean;
  /** How many candidates this call looked at (at most `cap`): lets a caller spend one budget over several calls. */
  examined: number;
  /** `cursors[i]` continues right after `nodes[i]`, so a caller that keeps only some of the page can resume there. */
  cursors: number[];
}

const CHUNK = 256; // candidates verified per SQL statement
/**
 * Step 1: candidate rowids in order: this tenant's rows whose title matches LIKE, any validity. That is the Postgres
 * list too, so both dialects spend `cap` on the same rows. 3+ characters: the trigram index finds rows, a rowid lookup
 * checks tenant and LIKE (the index folds all Unicode case, LIKE only ASCII); CROSS JOIN keeps the index first, no sort.
 */
export const FTS_CANDIDATES =
  "SELECT f.rowid AS r FROM node_titles f CROSS JOIN nodes n NOT INDEXED ON n.rowid = f.rowid WHERE f.title MATCH ? AND f.rowid > ? AND n.tenant = ? AND n.title LIKE ? ESCAPE '\\' ORDER BY f.rowid LIMIT ?";
// Under 3 characters there is no index: walk the table in rowid order. NOT INDEXED stops a sort by another index.
export const SHORT_CANDIDATES = "SELECT rowid AS r FROM nodes NOT INDEXED WHERE rowid > ? AND tenant = ? AND title LIKE ? ESCAPE '\\' ORDER BY rowid LIMIT ?";
/**
 * Step 2: verify `n` candidate rowids against the filter's WHERE terms. NOT INDEXED pins the access to a rowid lookup
 * per candidate: left alone, SQLite weighs the tenant and validity terms and can walk an index instead (50x slower).
 */
export const chunkSql = (where: string, n: number) =>
  `SELECT n.*, n.rowid AS rid FROM nodes n NOT INDEXED WHERE n.rowid IN (${Array(n).fill("?").join(",")}) AND ${where} ORDER BY n.rowid`;

/**
 * Title search in rowid (insertion) order, built so `limit` stops the work early.
 * 1. The trigram index lists candidate rowids in order, at most `cap` of them (no sort, no full match list).
 * 2. Candidates are checked CHUNK at a time (tenant, time, LIKE, kinds, edge rule), and `accept` runs on the survivors.
 * 3. Stop as soon as `limit` rows are found, or when the candidates run out.
 * Worst case cost: cap candidates, each with one index probe: a few ms, not the size of the graph.
 */
export function scanOps(db: DatabaseSync) {
  return (tenant: string, q: ScanQuery): ScanPage => {
    const { cap, after } = scanBounds(q);
    const f = titleFilter(tenant, q);
    // Step 1 binds (needle phrase,) cursor, tenant, LIKE pattern, cap.
    const [sql, head] = [...f.needle].length >= 3 ? [FTS_CANDIDATES, [f.match]] : [SHORT_CANDIDATES, []];
    const candidates = db
      .prepare(sql)
      .all(...head, after, f.tenant, f.like, cap)
      .map((r) => r["r"] as number);
    const [nodes, cursors]: [GraphNode[], number[]] = [[], []];
    for (let i = 0; i < candidates.length; i += CHUNK) {
      const ids = candidates.slice(i, i + CHUNK);
      for (const r of db.prepare(chunkSql(f.where, ids.length)).all(...ids, ...f.args)) {
        const n = toNode(r);
        if (q.accept && !q.accept(n)) continue;
        nodes.push(n);
        const rid = r["rid"] as number;
        cursors.push(rid);
        // Candidates and rows are both in rowid order, so the row's place in the list is how many were examined.
        if (nodes.length === q.limit) return { nodes, cursors, next: rid, truncated: false, examined: candidates.indexOf(rid, i) + 1 };
      }
    }
    const last = candidates[candidates.length - 1];
    const truncated = candidates.length === cap && last !== undefined;
    return { nodes, cursors, ...(truncated ? { next: last } : {}), truncated, examined: candidates.length };
  };
}
