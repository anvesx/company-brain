import type { Gate } from "@anvesx/visibility/gate";
import type pg from "pg";
import { membersByReaderSql, membersSql, smallAclSql } from "../db/clusters.js";

export const MEMBER_CAP = 500; // most member ids read per cluster per batch (the detail view); a count that hit its cap is shown as "at least"
const SMALL_ACL = 5000; // a viewer with fewer readable files than this reads members reader-first
const DEEP_ROUNDS = 8; // extra batches for a cluster whose first batch was entirely hidden by the gate
export type Member = { cid: string; doc: string };
/** Member reads kept for one request, so the levels of a tree read each cluster's members once. */
export type Reads = { memo: Map<string, Member[]>; cap?: number };

/**
 * Member ids of `clusters` that the viewer's can-read edges allow, with the set the gate approves. Every id goes through
 * `gate.approve`. A cluster whose first `cap` candidates were all hidden is read further (bounded), so one visible file
 * behind hundreds of hidden ones still shows the cluster.
 */
export async function approvedMembers(
  pool: pg.Pool,
  gate: Gate,
  tenant: string,
  clusters: string[],
  cap = MEMBER_CAP,
  memo: Map<string, Member[]> = new Map(),
): Promise<{ members: Member[]; ok: Set<string> }> {
  const principals = await gate.principals();
  let small: boolean | undefined;
  const read = async (cids: string[], after = ""): Promise<Member[]> => {
    if (small === undefined) {
      const a = smallAclSql(tenant, principals, SMALL_ACL);
      small = (await pool.query(a.sql, a.args)).rows[0]?.small === true;
    }
    const q = (small ? membersByReaderSql : membersSql)(tenant, cids, principals, cap, after);
    return (await pool.query(q.sql, q.args)).rows as Member[];
  };
  const fresh = clusters.filter((c) => !memo.has(c));
  for (const c of fresh) memo.set(c, []);
  if (fresh.length > 0) for (const m of await read(fresh)) memo.get(m.cid)?.push(m);
  const members = clusters.flatMap((c) => memo.get(c) ?? []);
  const ok = new Set((await gate.approve([...new Set(members.map((m) => m.doc))])).keys());
  const grouped = new Map<string, Member[]>();
  for (const m of members) (grouped.get(m.cid) ?? grouped.set(m.cid, []).get(m.cid))?.push(m);
  let needy = [...grouped].filter(([, rows]) => rows.length >= cap && !rows.some((m) => ok.has(m.doc)));
  for (let round = 0; round < DEEP_ROUNDS && needy.length > 0; round++) {
    const next: typeof needy = [];
    for (const [cid, rows] of needy) {
      const more = await read([cid], rows.at(-1)?.doc);
      members.push(...more);
      memo.get(cid)?.push(...more);
      for (const d of (await gate.approve([...new Set(more.map((m) => m.doc))])).keys()) ok.add(d);
      if (more.length >= cap && !more.some((m) => ok.has(m.doc))) next.push([cid, more]);
    }
    needy = next;
  }
  return { members, ok };
}
