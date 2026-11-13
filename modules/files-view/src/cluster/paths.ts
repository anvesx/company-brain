import type pg from "pg";
import { clustersSql, membershipSql } from "../db/clusters.js";

export type Chain = { id: string; title: string; why: string };
export type ClusterPath = { id: string; type: string; why: string; chain: Chain[] };
type Node = { id: string; title: string; props: Record<string, string> };

/** graph-store keeps props as sorted JSON entries; this is the object they describe. */
export const propsOf = (text: string): Record<string, string> => Object.fromEntries(JSON.parse(text) as [string, string][]);
const node = (r: { id: string; title: string; props: string }): Node => ({ id: r.id, title: r.title, props: propsOf(r.props) });

/** Loads clusters by id and, level by level, their ancestors. Depth is capped so a parent cycle ends. */
async function withAncestors(pool: pg.Pool, tenant: string, ids: string[]): Promise<Map<string, Node>> {
  const all = new Map<string, Node>();
  let want = [...new Set(ids)];
  for (let depth = 0; want.length > 0 && depth < 8; depth++) {
    const q = clustersSql(tenant, want);
    for (const r of (await pool.query(q.sql, q.args)).rows) all.set(r.id, node(r));
    want = [...new Set(want.flatMap((id) => all.get(id)?.props["cluster.parent"] ?? []))].filter((id) => !all.has(id));
  }
  return all;
}

const MAX_PATHS = 3;
/** Up to three cluster paths (root > ... > leaf) per document, each with the cluster's own `why`. */
export async function pathsFor(pool: pg.Pool, tenant: string, docs: string[]): Promise<Map<string, ClusterPath[]>> {
  const out = new Map<string, ClusterPath[]>();
  if (docs.length === 0) return out;
  const q = membershipSql(tenant, docs);
  const member = (await pool.query(q.sql, q.args)).rows as { doc: string; cid: string }[];
  const byId = await withAncestors(
    pool,
    tenant,
    member.map((m) => m.cid),
  );
  for (const { doc, cid } of member) {
    const leaf = byId.get(cid);
    const list = out.get(doc) ?? [];
    if (!leaf || list.length >= MAX_PATHS) continue;
    const chain: Chain[] = [];
    for (let n: Node | undefined = leaf, i = 0; n && i < 8; n = byId.get(n.props["cluster.parent"] ?? ""), i++)
      chain.unshift({ id: n.id, title: n.title, why: n.props["cluster.why"] ?? "" });
    list.push({ id: cid, type: leaf.props["cluster.type"] ?? "", why: leaf.props["cluster.why"] ?? "", chain });
    out.set(doc, list);
  }
  return out;
}
