import { clustersSql, membershipSql } from "../../../src/db/clusters.js";
import type { ListQuery } from "../../../src/db/list.js";
import { childrenSql, listSql, sampleSql, subtreeSql } from "../../../src/index.js";

export type Hot = { name: string; build: (i: number) => { sql: string; args: unknown[] }; expect: string[]; max: number; seqOk?: boolean };
const T = "t1";
const iso = (i: number): string => String(Date.UTC(2026, 0, 1) + ((i * 7919) % 1_000_000) * 1000);
const fid = (i: number): string => `f${1 + ((i * 7919) % 150000)}`;
const cids = (i: number, n = 100): string[] => Array.from({ length: n }, (_, k) => `c${300 + ((i * 17 + k) % 2690)}`);
const ROOTS = Array.from({ length: 30 }, (_, i) => `c${i}`);
const ALL = Array.from({ length: 1000 }, (_, i) => `c${i}`);
/** Index names the planner may legitimately pick: the module's fv_* ones or graph-store's own (edges_current, edges_out, nodes_current...). */
export const GS = ["edges_current", "edges_out", "edges_in", "nodes_current"];
/** (root, cluster) pairs of all 3000 clusters as subtreeSql returns them, by the seed's parent rule; C5 is c5 and its 99 descendants (/files?cluster=c5, about 7k members). */
const pairsOf = (): [string[], string[]] => {
  const g = Array.from({ length: 3000 }, (_, i) => i);
  return [g.map((i) => `c${i < 30 ? i : i < 300 ? i % 30 : (30 + (i % 270)) % 30}`), g.map((i) => `c${i}`)];
};
const C5 = pairsOf()[1].filter((_, i) => pairsOf()[0][i] === "c5");
const base: ListQuery = { sort: "modified", dir: "desc", limit: 100 };

/** A page of the real listSql for a viewer; `after` builds a keyset cursor row from i so deep pages are exercised, never OFFSET. */
const page = (name: string, who: string, q: Partial<ListQuery>, want: string[], key?: (i: number) => string): Hot => {
  // scan.ts drives a filtered query from the readable ids when the ACL is small for a cluster filter (erin 3k, carol 21k readable) or a search (erin); everything else walks its sort index
  const small = (q.clusters !== undefined && (who === "erin" || who === "carol")) || (q.q !== undefined && who === "erin");
  const query = { ...base, ...q, ...(small && { byReader: true, walk: false }) };
  const o = `${query.sort}:${query.dir}`;
  return {
    name: `${name} (${who})`,
    max: 101,
    seqOk: small, // a reader-driven plan may hash-join a parallel scan of nodes; its time is still bounded by the p95 check
    expect: [...want, ...GS],
    build: (i) => listSql(T, [who], query, 101, key ? { o, k: key(i), i: fid(i) } : undefined),
  };
};

export const HOT: Hot[] = ["erin", "alice", "carol", "bob"]
  .flatMap((w) => [
    page("list modified desc p1", w, {}, ["fv_doc_modified"]),
    page("list modified desc deep", w, {}, ["fv_doc_modified"], iso),
    page("list modified asc deep", w, { dir: "asc" }, ["fv_doc_modified"], iso),
    page("list title asc deep", w, { sort: "title", dir: "asc" }, ["fv_doc_title"], (i) => `Report ${(i % 16).toString(16)}`),
    page("list size desc deep", w, { sort: "size" }, ["fv_doc_size"], (i) => String(1_000_000 + i * 9973)),
    page("search title", w, { q: "dead" }, ["nodes_title_trgm"]),
    page("search title non-ASCII (école)", w, { q: "école" }, ["fv_title_icu"]),
    page("search title non-ASCII (Übersicht)", w, { q: "Übersicht" }, ["fv_title_icu"]),
    page("filter owner", w, { owner: "u7" }, ["fv_doc_owner", "fv_doc_modified"]),
    page("filter owner by size", w, { owner: "u0", sort: "size" }, ["fv_doc_owner_size"]),
    page("filter source by title", w, { source: "gdrive", sort: "title", dir: "asc" }, ["fv_doc_source_title"]),
    page("filter mime by size", w, { mime: "image/png", sort: "size" }, ["fv_doc_mime_size"]),
    page("cluster c5 subtree (100 clusters) by size", w, { clusters: C5, sort: "size", walk: true }, ["fv_members", "fv_doc_size"]),
    page("filter source+mime", w, { source: "gdrive", mime: "image/png" }, ["fv_doc_modified", "fv_doc_owner", "fv_doc_source", "fv_doc_mime"]),
    page("filter modified range", w, { from: "2026-01-03T00:00:00Z", to: "2026-01-06T00:00:00Z" }, ["fv_doc_modified"]),
    page("cluster members (leaf)", w, { clusters: ["c555"] }, ["fv_members"]),
    page("cluster members (giant 50k)", w, { clusters: ["c300"], walk: true }, ["fv_members", "fv_doc_modified"]),
    page("cluster members (1,000 clusters)", w, { clusters: ALL, walk: true }, ["fv_members", "fv_doc_modified"]),
  ])
  .concat([
    { name: "tree roots", build: () => childrenSql(T, "", 101), expect: ["fv_cluster_parent"], max: 101 },
    { name: "tree children", build: (i) => childrenSql(T, `c${i % 30}`, 101, ""), expect: ["fv_cluster_parent"], max: 101 },
    { name: "tree subtree (30 roots)", build: () => subtreeSql(T, ROOTS), expect: ["fv_cluster_id", "fv_cluster_parent"], max: 4000 },
    // describe.ts samples capFor(rows) visible member ids per described root over its whole subtree: one probe per root, stopping at the cap.
    {
      name: "tree member sample (30 roots, subtrees of 100, cap 66, bob)",
      build: () => sampleSql(T, ...pairsOf(), ["bob"], 66),
      expect: ["fv_members"],
      max: 30 * 66,
    },
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
