import { clustersSql, membershipSql } from "../../../src/db/clusters.js";
import type { ListQuery } from "../../../src/db/list.js";
import { childrenSql, listSql, membersSql, subtreeSql } from "../../../src/index.js";

export type Hot = { name: string; build: (i: number) => { sql: string; args: unknown[] }; expect: string[]; max: number };
const T = "t1";
const iso = (i: number): string => String(Date.UTC(2026, 0, 1) + ((i * 7919) % 1_000_000) * 1000);
const fid = (i: number): string => `f${1 + ((i * 7919) % 100000)}`;
const cids = (i: number, n = 100): string[] => Array.from({ length: n }, (_, k) => `c${200 + ((i * 17 + k) % 1790)}`);
const ROOTS = Array.from({ length: 20 }, (_, i) => `c${i}`);
const ALL = Array.from({ length: 2000 }, (_, i) => `c${i}`);
/** Index names the planner may legitimately pick: the module's fv_* ones or graph-store's own (edges_current, edges_out, nodes_current...). */
export const GS = ["edges_current", "edges_out", "edges_in", "nodes_current"];
const base: ListQuery = { sort: "modified", dir: "desc", limit: 100 };

/** A page of the real listSql for a viewer; `after` builds a keyset cursor row from i so deep pages are exercised, never OFFSET. */
const page = (name: string, who: string, q: Partial<ListQuery>, want: string[], key?: (i: number) => string): Hot => {
  const query = { ...base, ...q };
  const o = `${query.sort}:${query.dir}`;
  return {
    name: `${name} (${who})`,
    max: 101,
    expect: [...want, ...GS],
    build: (i) => listSql(T, [who], query, 101, key ? { o, k: key(i), i: fid(i) } : undefined),
  };
};

export const HOT: Hot[] = ["alice", "bob"]
  .flatMap((w) => [
    page("list modified desc p1", w, {}, ["fv_doc_modified"]),
    page("list modified desc deep", w, {}, ["fv_doc_modified"], iso),
    page("list modified asc deep", w, { dir: "asc" }, ["fv_doc_modified"], iso),
    page("list title asc deep", w, { sort: "title", dir: "asc" }, ["fv_doc_title"], (i) => `Report ${(i % 16).toString(16)}`),
    page("list size desc deep", w, { sort: "size" }, ["fv_doc_size"], (i) => String(1_000_000 + i * 9973)),
    page("search title", w, { q: "dead" }, ["nodes_title_trgm"]),
    page("filter owner", w, { owner: "u7" }, ["fv_doc_owner", "fv_doc_modified"]),
    page("filter source+mime", w, { source: "gdrive", mime: "image/png" }, ["fv_doc_modified", "fv_doc_owner", "fv_doc_source", "fv_doc_mime"]),
    page("filter modified range", w, { from: "2026-02-01T00:00:00Z", to: "2026-02-20T00:00:00Z" }, ["fv_doc_modified"]),
    page("cluster members (leaf)", w, { clusters: ["c555"] }, ["fv_members"]),
    page("cluster members (giant 33k)", w, { clusters: ["c200"] }, ["fv_members", "fv_doc_modified"]),
    page("cluster members (all 2000 clusters)", w, { clusters: ALL }, ["fv_members", "fv_doc_modified"]),
  ])
  .concat([
    { name: "tree roots", build: () => childrenSql(T, "", 101), expect: ["fv_cluster_parent"], max: 101 },
    { name: "tree children", build: (i) => childrenSql(T, `c${i % 20}`, 101, ""), expect: ["fv_cluster_parent"], max: 101 },
    { name: "tree subtree (20 roots)", build: () => subtreeSql(T, ROOTS), expect: ["fv_cluster_id", "fv_cluster_parent"], max: 4000 },
    // describe.ts passes cap = capFor(clusters) = max(2, min(500, floor(3000 / 2000))) = 2 rows PER CLUSTER (lateral), so at most 4,000 rows.
    { name: "tree member ids (2000 clusters, cap 2 per cluster, bob)", build: () => membersSql(T, ALL, ["bob"], 2), expect: ["fv_members"], max: 4000 },
    {
      name: "paths: clusters of 100 files",
      build: (i) =>
        membershipSql(
          T,
          Array.from({ length: 100 }, (_, k) => fid(i * 3 + k)),
        ),
      expect: ["fv_member_of"],
      max: 400,
    },
    { name: "paths: cluster nodes", build: (i) => clustersSql(T, cids(i)), expect: ["fv_cluster_id"], max: 100 },
  ]);
