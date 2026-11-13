type Q = { sql: string; args: unknown[] };
const LIVE = "valid_to IS NULL AND kind = 'project'";

/** One level of the cluster tree (parent "" means roots), keyset by id. Uses fv_cluster_parent. */
export const childrenSql = (tenant: string, parent: string, take: number, afterId = ""): Q => ({
  sql: `SELECT id, title, props FROM nodes WHERE tenant = $1 AND ${LIVE} AND fv_prop(props, 'cluster.parent') = $2 AND id > $3 ORDER BY id LIMIT $4`,
  args: [tenant, parent, afterId, take],
});

/** Clusters by id (path rendering, detail). Uses fv_cluster_id. */
export const clustersSql = (tenant: string, ids: string[]): Q => ({
  sql: `SELECT id, title, props FROM nodes WHERE tenant = $1 AND ${LIVE} AND id = ANY($2::text[])`,
  args: [tenant, ids],
});

/** Every cluster under each root, the root included, as (root, id) pairs. Depth is capped so a parent cycle cannot loop. */
export const subtreeSql = (tenant: string, roots: string[]): Q => ({
  sql: `WITH RECURSIVE sub(root, id, d) AS (
    SELECT id, id, 0 FROM nodes WHERE tenant = $1 AND ${LIVE} AND id = ANY($2::text[])
    UNION ALL
    SELECT s.root, c.id, s.d + 1 FROM sub s JOIN nodes c ON c.tenant = $1 AND c.valid_to IS NULL AND c.kind = 'project'
      AND fv_prop(c.props, 'cluster.parent') = s.id WHERE s.d < 8)
    SELECT DISTINCT root, id FROM sub`,
  args: [tenant, roots],
});

/**
 * Up to `cap` readable-by-principals member rows per root, over every cluster of that root's subtree (`pairs` are (root, cluster) from subtreeSql),
 * minus the `seen` ids. One index probe per root that stops at `cap` rows (fv_members; the viewer's can-read edge is checked in fv_readers),
 * so cost follows `cap` and the number of roots, not the size of the subtrees. A document in two clusters of one subtree may repeat.
 */
export const sampleSql = (tenant: string, roots: string[], cids: string[], principals: string[], cap: number, seen: string[] = []): Q => ({
  sql: `SELECT g.root, m.doc FROM (SELECT root, array_agg(cid) AS cids FROM unnest($2::text[], $3::text[]) AS p(root, cid) GROUP BY root) g CROSS JOIN LATERAL (
    SELECT e.from_id AS doc FROM edges e WHERE e.tenant = $1 AND e.to_id = ANY(g.cids) AND e.kind = 'belongs-to' AND e.valid_to IS NULL AND e.from_id <> ALL($6::text[])
      AND EXISTS (SELECT 1 FROM edges r WHERE r.tenant = e.tenant AND r.to_id = e.from_id AND r.kind = 'can-read' AND r.valid_to IS NULL AND r.from_id = ANY($4::text[]))
    LIMIT $5) m`,
  args: [tenant, roots, cids, principals, cap, seen],
});

/** True when the principals hold fewer than `limit` current can-read edges (a bounded count over the principals' outgoing edges): their ACL is small enough to drive from. */
export const smallAclSql = (tenant: string, principals: string[], limit: number): Q => ({
  sql: "SELECT count(*) < $3 AS small FROM (SELECT 1 FROM edges WHERE tenant = $1 AND kind = 'can-read' AND valid_to IS NULL AND from_id = ANY($2::text[]) LIMIT $3) s",
  args: [tenant, principals, limit],
});

/**
 * Same result shape as sampleSql, driven from the viewer's readable documents into their memberships (fv_member_of), so wholly hidden
 * subtrees cost nothing. Only for small ACLs: for a large one sampleSql's probe that stops at `cap` is cheaper.
 */
export const sampleByReaderSql = (tenant: string, roots: string[], cids: string[], principals: string[], cap: number, seen: string[] = []): Q => ({
  sql: `SELECT root, doc FROM (
    SELECT p.root, m.from_id AS doc, row_number() OVER (PARTITION BY p.root ORDER BY m.from_id) AS rn
    FROM (SELECT DISTINCT to_id AS d FROM edges WHERE tenant = $1 AND kind = 'can-read' AND valid_to IS NULL AND from_id = ANY($4::text[])) r
    JOIN edges m ON m.tenant = $1 AND m.from_id = r.d AND m.kind = 'belongs-to' AND m.valid_to IS NULL AND m.from_id <> ALL($6::text[])
    JOIN unnest($2::text[], $3::text[]) AS p(root, cid) ON p.cid = m.to_id) x
    WHERE rn <= $5 ORDER BY root, doc`,
  args: [tenant, roots, cids, principals, cap, seen],
});

/** True when the clusters hold at least `limit` current member rows (counted up to `limit`): the filter is too wide to read members first. Uses fv_members. */
export const wideSql = (tenant: string, clusters: string[], limit: number): Q => ({
  sql: "SELECT count(*) >= $3 AS wide FROM (SELECT 1 FROM edges WHERE tenant = $1 AND kind = 'belongs-to' AND valid_to IS NULL AND to_id = ANY($2::text[]) LIMIT $3) s",
  args: [tenant, clusters, limit],
});

/** Children of several parents at once, up to `take` per parent in id order (a lateral keyset read per parent). Uses fv_cluster_parent. */
export const childrenManySql = (tenant: string, parents: string[], take: number): Q => ({
  sql: `SELECT p.parent, c.id, c.title, c.props FROM unnest($2::text[]) AS p(parent) CROSS JOIN LATERAL (
    SELECT id, title, props FROM nodes WHERE tenant = $1 AND ${LIVE} AND fv_prop(props, 'cluster.parent') = p.parent ORDER BY id LIMIT $3) c`,
  args: [tenant, parents, take],
});

/** Clusters each listed document belongs to, as (doc, cid) pairs. Uses fv_member_of. */
export const membershipSql = (tenant: string, docs: string[]): Q => ({
  sql: "SELECT from_id AS doc, to_id AS cid FROM edges WHERE tenant = $1 AND kind = 'belongs-to' AND valid_to IS NULL AND from_id = ANY($2::text[]) ORDER BY from_id, to_id",
  args: [tenant, docs],
});
