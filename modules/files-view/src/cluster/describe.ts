import type { Gate } from "@anvesx/visibility/gate";
import type pg from "pg";
import { clustersSql, subtreeSql } from "../db/clusters.js";
import { approvedMembers, MEMBER_CAP, type Reads } from "./members.js";
import { propsOf } from "./paths.js";

export type ClusterInfo = { id: string; title: string; type: string; why: string; parent: string; count: number; capped: boolean; subtree: string[] };
export type Row = { id: string; title: string; props: string };

const BUDGET = 3000; // member ids a tree read decides on, spread over the clusters it covers (the p95 <= 300 ms cold-read bound)
/** Member ids read per cluster: all (up to MEMBER_CAP) for a small tree, down to 2 for a big one. A count that hit it is "at least". */
export const capFor = (clusters: number): number => Math.max(2, Math.min(MEMBER_CAP, Math.floor(BUDGET / Math.max(clusters, 1))));

export const q = async (pool: pg.Pool, built: { sql: string; args: unknown[] }) => (await pool.query(built.sql, built.args)).rows;

/**
 * Describes clusters with the number of files this viewer may see in each one's whole subtree (counted over the first `capFor` members of
 * every cluster). Every member id goes through `gate.approve`, so hidden files never count. A cluster whose visible count is 0 is dropped:
 * its name could reveal a hidden file.
 */
export async function describeAll(pool: pg.Pool, gate: Gate, tenant: string, rows: Row[], reads: Reads = { memo: new Map() }): Promise<ClusterInfo[]> {
  if (rows.length === 0) return [];
  const subs = (await q(
    pool,
    subtreeSql(
      tenant,
      rows.map((r) => r.id),
    ),
  )) as { root: string; id: string }[];
  const all = [...new Set(subs.map((s) => s.id))];
  if (reads.cap === undefined) reads.cap = capFor(all.length);
  const cap = reads.cap;
  const { members, ok } = await approvedMembers(pool, gate, tenant, all, cap, reads.memo);
  const perRoot = new Map<string, Set<string>>();
  for (const s of subs) perRoot.set(s.root, (perRoot.get(s.root) ?? new Set()).add(s.id));
  const byCluster = new Map<string, string[]>(); // one pass: a cluster's member ids, so each root reads only its own subtree's
  for (const m of members) (byCluster.get(m.cid) ?? byCluster.set(m.cid, []).get(m.cid))?.push(m.doc);
  return rows.flatMap((r) => {
    const ids = perRoot.get(r.id) ?? new Set<string>();
    const count = new Set([...ids].flatMap((id) => (byCluster.get(id) ?? []).filter((d) => ok.has(d)))).size;
    const p = propsOf(r.props);
    const capped = [...ids].some((id) => (byCluster.get(id)?.length ?? 0) >= cap);
    return count > 0
      ? [
          {
            id: r.id,
            title: r.title,
            type: p["cluster.type"] ?? "",
            why: p["cluster.why"] ?? "",
            parent: p["cluster.parent"] ?? "",
            count,
            capped,
            subtree: [...ids],
          },
        ]
      : [];
  });
}

/** One cluster, or undefined when it is missing or holds no file the viewer may see (both look the same to the caller). */
export async function visibleCluster(pool: pg.Pool, gate: Gate, tenant: string, id: string): Promise<ClusterInfo | undefined> {
  return (await describeAll(pool, gate, tenant, (await q(pool, clustersSql(tenant, [id]))) as Row[]))[0];
}
