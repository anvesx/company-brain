import type { Gate } from "@anvesx/visibility/gate";
import type pg from "pg";
import { smallAclSql, wideSql } from "../db/clusters.js";
import { type Cursor, encode } from "../db/cursor.js";
import { cursorOf, type ListQuery, listSql, orderOf } from "../db/list.js";
import type { CountedGate } from "./gate.js";

export type Row = Record<string, string>;
export type Kept = { row: Row; readers?: string[] | undefined };

// An ACL under this many readable ids drives the query from them, but only where the sort index cannot serve the filter: a cluster filter (members
// are unordered) or a text search. Source, type, owner and date filters walk their own sort index, which is faster for any ACL size.
const SMALL_CLUSTER = 30000;
const SMALL_SEARCH = 5000;
const WIDE = 2500; // a cluster filter over this many member rows walks the sort index; below it, members are read first and sorted
const ROUNDS = 40; // bounded over-fetch: at most ROUNDS candidate batches per request, then the page ends with a cursor to continue
const spent = (g: Gate | CountedGate): number => ("rechecks" in g ? g.rechecks() : 0);

/**
 * Walks candidates in keyset order and keeps the ones `gate.approve` allows, until the page is full (one extra row proves
 * there is a next page), the candidates end, or the request's live-recheck budget is used. Candidates are decided in chunks
 * of the page size (at least 50); no chunk starts once more than one chunk of rechecks was made, so a request makes about
 * 2 x chunk source calls at most. A stopped scan returns a cursor after the last decided row, so no row is skipped.
 */
export async function scan(pool: pg.Pool, gate: Gate | CountedGate, tenant: string, asked: ListQuery): Promise<{ kept: Kept[]; next?: string }> {
  const principals = await gate.principals();
  const w = asked.clusters ? wideSql(tenant, asked.clusters, WIDE) : undefined;
  const limit = asked.clusters ? SMALL_CLUSTER : asked.q ? SMALL_SEARCH : 0;
  const sa = smallAclSql(tenant, principals, limit);
  const small = limit > 0 && (await pool.query(sa.sql, sa.args)).rows[0]?.small === true;
  const wide = !small && w !== undefined && (await pool.query(w.sql, w.args)).rows[0]?.wide === true;
  const q: ListQuery = { ...asked, ...(small && { byReader: true }), ...(wide && { walk: true }) };
  const chunk = Math.max(q.limit, 50);
  const batch = Math.max(q.limit * 4, 200);
  const key = (r: Row): Cursor => ({ o: orderOf(q), k: r["k"] as string, i: r["id"] as string });
  const base = spent(gate);
  const kept: Kept[] = [];
  let at = cursorOf(q);
  for (let round = 0; round < ROUNDS; round++) {
    const { sql, args } = listSql(tenant, principals, q, batch, at);
    const rows = (await pool.query(sql, args)).rows as Row[];
    for (let i = 0; i < rows.length; i += chunk) {
      if (spent(gate) - base > chunk) return { kept, next: encode(key(rows[i - 1] as Row)) };
      const part = rows.slice(i, i + chunk);
      const ok = await gate.approve(part.map((r) => r["id"] as string));
      for (const row of part) {
        const hit = ok.get(row["id"] as string);
        if (hit) kept.push({ row, readers: hit.readers });
        if (kept.length > q.limit) return { kept: kept.slice(0, q.limit), next: encode(key(kept[q.limit - 1]?.row ?? row)) };
      }
    }
    const last = rows.at(-1);
    if (rows.length < batch || !last) return { kept };
    at = key(last);
  }
  return { kept, ...(at && { next: encode(at) }) };
}
