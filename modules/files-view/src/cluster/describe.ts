import type { Gate } from "@anvesx/visibility/gate";
import type pg from "pg";
import { clustersSql, subtreeSql } from "../db/clusters.js";
import { approvedSample, capFor } from "./members.js";
import { propsOf } from "./paths.js";

export type ClusterInfo = { id: string; title: string; type: string; why: string; parent: string; count: number; capped: boolean; subtree: string[] };
export type Row = { id: string; title: string; props: string };

export const q = async (pool: pg.Pool, built: { sql: string; args: unknown[] }) => (await pool.query(built.sql, built.args)).rows;

/**
 * Describes clusters with the number of files this viewer may see in each one's whole subtree (counted over a sample of up to `capFor`
 * files per cluster, so the work does not grow with the size of the trees). Every sampled id goes through `gate.approve`, so hidden files
 * never count. A cluster whose visible count is 0 is dropped: its name could reveal a hidden file.
 */
export async function describeAll(pool: pg.Pool, gate: Gate, tenant: string, rows: Row[]): Promise<ClusterInfo[]> {
  if (rows.length === 0) return [];
  const pairs = (await q(
    pool,
    subtreeSql(
      tenant,
      rows.map((r) => r.id),
    ),
  )) as { root: string; id: string }[];
  const { count, capped } = await approvedSample(pool, gate, tenant, pairs, capFor(rows.length));
  const subtree = new Map<string, string[]>();
  for (const x of pairs) (subtree.get(x.root) ?? subtree.set(x.root, []).get(x.root))?.push(x.id);
  return rows.flatMap((r) => {
    const p = propsOf(r.props);
    const n = count.get(r.id) ?? 0;
    const info = { id: r.id, title: r.title, type: p["cluster.type"] ?? "", why: p["cluster.why"] ?? "", parent: p["cluster.parent"] ?? "" };
    return n > 0 ? [{ ...info, count: n, capped: capped.has(r.id), subtree: subtree.get(r.id) ?? [] }] : [];
  });
}

/** One cluster, or undefined when it is missing or holds no file the viewer may see (both look the same to the caller). */
export async function visibleCluster(pool: pg.Pool, gate: Gate, tenant: string, id: string): Promise<ClusterInfo | undefined> {
  return (await describeAll(pool, gate, tenant, (await q(pool, clustersSql(tenant, [id]))) as Row[]))[0];
}
