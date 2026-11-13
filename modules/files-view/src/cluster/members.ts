import type { Gate } from "@anvesx/visibility/gate";
import type pg from "pg";
import { sampleByReaderSql, sampleSql, smallAclSql } from "../db/clusters.js";

export const MEMBER_CAP = 500; // most visible member ids sampled per cluster; a count that hit its cap is shown as "at least"
const BUDGET = 2400; // visible member ids a read samples across all clusters it describes (the p95 <= 300 ms bound at 100k+ files)
const SMALL_ACL = 5000; // a viewer with fewer readable files than this reads members reader-first
const DEEP_ROUNDS = 8; // extra batches for a cluster whose first batch was entirely hidden by the gate
/** Member ids sampled per described cluster: MEMBER_CAP for a few clusters, down to 4 for many. A count that hit it is "at least". */
export const capFor = (clusters: number): number => Math.max(4, Math.min(MEMBER_CAP, Math.floor(BUDGET / Math.max(clusters, 1))));
export type Sample = { count: Map<string, number>; capped: Set<string> };

/**
 * For each root, the number of gate-approved files in a sample of up to `cap` files its can-read edges allow over the root's whole
 * subtree (`pairs` are (root, cluster) from subtreeSql). Every sampled id goes through `gate.approve`. A root whose sample was entirely
 * hidden by the gate is read further (bounded), so a visible file behind hundreds of hidden ones still shows the cluster.
 */
export async function approvedSample(pool: pg.Pool, gate: Gate, tenant: string, pairs: { root: string; id: string }[], cap: number): Promise<Sample> {
  const principals = await gate.principals();
  const a = smallAclSql(tenant, principals, SMALL_ACL);
  const build = (await pool.query(a.sql, a.args)).rows[0]?.small === true ? sampleByReaderSql : sampleSql;
  const read = async (p: { root: string; id: string }[], seen: string[] = []) => {
    const q = build(
      tenant,
      p.map((x) => x.root),
      p.map((x) => x.id),
      principals,
      cap,
      seen,
    );
    return (await pool.query(q.sql, q.args)).rows as { root: string; doc: string }[];
  };
  const docs = new Map<string, Set<string>>(); // root -> sampled ids
  const rows = new Map<string, number>(); // root -> sample rows read last round
  const add = (got: { root: string; doc: string }[]) => {
    for (const g of got) (docs.get(g.root) ?? docs.set(g.root, new Set()).get(g.root))?.add(g.doc);
  };
  const first = await read(pairs);
  add(first);
  for (const g of first) rows.set(g.root, (rows.get(g.root) ?? 0) + 1);
  const ok = new Set((await gate.approve([...new Set(first.map((g) => g.doc))])).keys());
  const hidden = (root: string) => ![...(docs.get(root) ?? [])].some((d) => ok.has(d));
  let needy = [...rows].filter(([root, n]) => n >= cap && hidden(root)).map(([root]) => root);
  for (let round = 0; round < DEEP_ROUNDS && needy.length > 0; round++) {
    const next: string[] = [];
    for (const root of needy) {
      const more = await read(
        pairs.filter((x) => x.root === root),
        [...(docs.get(root) ?? [])],
      );
      add(more);
      for (const d of (await gate.approve([...new Set(more.map((m) => m.doc))])).keys()) ok.add(d);
      if (more.length >= cap && !more.some((m) => ok.has(m.doc))) next.push(root);
    }
    needy = next;
  }
  const count = new Map([...docs].map(([root, ids]) => [root, [...ids].filter((d) => ok.has(d)).length]));
  return { count, capped: new Set([...rows].filter(([, n]) => n >= cap).map(([root]) => root)) };
}
