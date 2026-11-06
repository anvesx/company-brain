import type { DatabaseSync } from "node:sqlite";
import { toNode } from "../nodes.js";
import { bad, type GraphNode } from "../schema.js";
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
}

export const DEFAULT_CAP = 4096;
const CHUNK = 256; // candidates verified per SQL statement
/** Step 1: candidate rowids, in order, from the trigram index (needle of 3+ characters) or the table (shorter). */
export const FTS_CANDIDATES = "SELECT rowid AS r FROM node_titles WHERE title MATCH ? AND rowid > ? ORDER BY rowid LIMIT ?";
// Under 3 characters there is no index: walk the table in rowid order. NOT INDEXED stops a sort by another index.
export const SHORT_CANDIDATES = "SELECT rowid AS r FROM nodes NOT INDEXED WHERE rowid > ? AND tenant = ? ORDER BY rowid LIMIT ?";
/**
 * Step 2: verify `n` candidate rowids against the filter's WHERE terms. NOT INDEXED pins the access to a rowid lookup
 * per candidate: left alone, SQLite weighs the tenant and validity terms and can walk an index instead (50x slower).
 */
export const chunkSql = (where: string, n: number) =>
  `SELECT n.*, n.rowid AS rid FROM nodes n NOT INDEXED WHERE n.rowid IN (${Array(n).fill("?").join(",")}) AND ${where} ORDER BY n.rowid`;

/**
 * Checks `limit`, `cap` and `cursor` the same way for both dialects, before any SQL runs. A cursor above
 * 2^53 - 1 is refused: no row we handed out has one, and Postgres bigint overflows at 2^63 (raw error 22003).
 */
export function scanBounds(q: ScanQuery): { cap: number; after: number } {
  if (!Number.isInteger(q?.limit) || q.limit < 1 || q.limit > 1000) bad("limit must be a whole number from 1 to 1000");
  const cap = q.cap ?? DEFAULT_CAP;
  if (!Number.isInteger(cap) || cap < 1 || cap > 1_000_000) bad("cap must be a whole number from 1 to 1000000");
  const after = q.cursor ?? 0;
  if (!Number.isSafeInteger(after) || after < 0) bad("cursor must be a whole number from 0 to 2^53 - 1");
  return { cap, after };
}

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
    const candidates = (
      [...f.needle].length >= 3 ? db.prepare(FTS_CANDIDATES).all(f.match, after, cap) : db.prepare(SHORT_CANDIDATES).all(after, tenant, cap)
    ).map((r) => r["r"] as number);
    const nodes: GraphNode[] = [];
    for (let i = 0; i < candidates.length; i += CHUNK) {
      const ids = candidates.slice(i, i + CHUNK);
      for (const r of db.prepare(chunkSql(f.where, ids.length)).all(...ids, ...f.args)) {
        const n = toNode(r);
        if (q.accept && !q.accept(n)) continue;
        nodes.push(n);
        if (nodes.length === q.limit) return { nodes, next: r["rid"] as number, truncated: false };
      }
    }
    const last = candidates[candidates.length - 1];
    const truncated = candidates.length === cap && last !== undefined;
    return { nodes, ...(truncated ? { next: last } : {}), truncated };
  };
}
