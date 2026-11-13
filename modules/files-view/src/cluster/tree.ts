import type { Gate } from "@anvesx/visibility/gate";
import type pg from "pg";
import { childrenManySql, childrenSql, clustersSql } from "../db/clusters.js";
import { type ClusterInfo, describeAll, q, type Row } from "./describe.js";
import type { Reads } from "./members.js";
import { propsOf } from "./paths.js";

export { visibleCluster } from "./describe.js";

export type { ClusterInfo };
export type ClusterPage = { clusters: ClusterInfo[]; next?: string };

const ROUNDS = 20;

/** Children of `parent` ("" for the roots) in id order, keyset-paged, hidden-only clusters dropped; full pages while any remain. */
export async function visibleChildren(
  pool: pg.Pool,
  gate: Gate,
  tenant: string,
  parent: string,
  limit: number,
  after = "",
  reads?: Reads,
): Promise<ClusterPage> {
  const out: ClusterInfo[] = [];
  let at = after;
  for (let round = 0; round < ROUNDS && out.length < limit; round++) {
    const need = limit - out.length;
    const rows = (await q(pool, childrenSql(tenant, parent, need + 1, at))) as Row[];
    const more = rows.length > need;
    const page = rows.slice(0, need);
    out.push(...(await describeAll(pool, gate, tenant, page, reads)));
    const last = page.at(-1);
    if (!more || !last) return { clusters: out };
    at = last.id;
  }
  return { clusters: out, ...(at && { next: at }) };
}

export type TreeNode = ClusterInfo & { children: TreeNode[] };

/** Visible children of every parent in one read each for SQL, members and gate; a parent whose short list may hide more falls back to the paged read. */
async function childLevel(pool: pg.Pool, gate: Gate, tenant: string, parents: string[], limit: number, reads: Reads): Promise<ClusterInfo[]> {
  const rows = (await q(pool, childrenManySql(tenant, parents, limit + 1))) as (Row & { parent: string })[];
  const shown = new Map((await describeAll(pool, gate, tenant, rows, reads)).map((c) => [c.id, c]));
  const out: ClusterInfo[] = [];
  for (const parent of parents) {
    const mine = rows.filter((r) => r.parent === parent);
    const live = mine.flatMap((r) => shown.get(r.id) ?? []);
    const more = mine.length > limit && live.length < limit;
    out.push(...(more ? (await visibleChildren(pool, gate, tenant, parent, limit, "", reads)).clusters : live.slice(0, limit)));
  }
  return out;
}

/** The cluster tree under `parent`, `depth` levels deep, each parent keyset-paged to `limit`; clusters with no visible file never appear. */
export async function visibleTree(pool: pg.Pool, gate: Gate, tenant: string, parent: string, limit: number, depth: number): Promise<TreeNode[]> {
  const reads: Reads = { memo: new Map() };
  const grow = async (level: ClusterInfo[], left: number): Promise<TreeNode[]> => {
    if (left <= 0 || level.length === 0) return level.map((c) => ({ ...c, children: [] }));
    const ids = level.map((c) => c.id);
    const next = await childLevel(pool, gate, tenant, ids, limit, reads);
    const kids = await grow(next, left - 1);
    return level.map((c) => ({ ...c, children: kids.filter((k) => k.parent === c.id) }));
  };
  return grow((await visibleChildren(pool, gate, tenant, parent, limit, "", reads)).clusters, depth - 1);
}

/** Ancestors of a visible cluster, root first. They hold its visible files, so they need no count of their own. Depth is capped. */
export async function visibleAncestors(pool: pg.Pool, tenant: string, info: ClusterInfo): Promise<{ id: string; title: string }[]> {
  const out: { id: string; title: string; parent: string }[] = [];
  for (let up = info.parent; up && out.length < 8; ) {
    const [row] = (await q(pool, clustersSql(tenant, [up]))) as Row[];
    if (!row) break;
    const parent = propsOf(row.props)["cluster.parent"] ?? "";
    out.unshift({ id: row.id, title: row.title, parent });
    up = parent;
  }
  return out;
}
