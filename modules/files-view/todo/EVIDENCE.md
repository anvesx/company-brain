# files-view evidence

Command: `timeout 900 pnpm --filter @anvesx/files-view test` (env: PATH with postgresql@16, NODE_AUTH_TOKEN=x, LC_ALL=en_US.UTF-8, DATABASE_URL on port 55496). Exit 0.

## Test tail

```
 Test Files  51 passed (51)
      Tests  440 passed (440)
   Duration  373.16s (tests 98%, import 2%)
All files          |   98.77 |    94.77 |   97.97 |   99.42 |                   
timeout 900 pnpm --filter @anvesx/files-view test  217.87s user 37.22s system 68% cpu 6:13.86 total
exit 0
```

## Gates

```
pnpm structure rc=0: checked 26 packages, 1365 files, 377 folders
pnpm guard:fakes rc=0: checked 922 files, 4 findings, 1 baselined
pnpm deps rc=0: ✔ no dependency violations found (1217 modules, 2906 dependencies cruised)
pnpm exec biome check modules/files-view rc=0: Checked 149 files, no fixes applied (after formatting this file)
```

## Scale (100k+ files, 2,000 clusters, Postgres 16; p50 / p95 / p99 ms; plan nodes from EXPLAIN ANALYZE)

```
HTTP (real Hono + JWKS + jwtAuth + pgGate, sequential) | TTFB p50 ms | p95 ms | p99 ms | total p95 ms
alice /files | 34.1 | 39.6 | 71.2 | 39.8
alice /files?sort=title | 20.3 | 22.0 | 23.6 | 22.1
alice /files?sort=size | 81.1 | 88.3 | 150.0 | 88.4
alice /files?q= | 1.5 | 3.2 | 3.3 | 3.2
alice /files?owner= | 1.7 | 1.9 | 10.3 | 1.9
alice /files/:id | 1.4 | 1.7 | 2.1 | 1.8
alice /clusters | 168.4 | 207.5 | 262.7 | 207.9
alice /clusters?limit=5 | 45.2 | 50.4 | 81.7 | 50.4
alice /clusters/:id (leaf) | 6.2 | 6.6 | 7.0 | 6.6
alice /clusters/:id (giant 33k) | 53.2 | 58.6 | 97.5 | 58.7
alice /clusters/:id (root) | 30.7 | 61.5 | 66.9 | 61.6
bob /files | 13.8 | 15.2 | 18.2 | 15.3
bob /files?sort=title | 11.3 | 14.0 | 14.9 | 14.2
bob /files?sort=size | 23.4 | 31.7 | 57.2 | 31.9
bob /files?q= | 6.1 | 6.5 | 7.1 | 6.5
bob /files?owner= | 6.0 | 13.6 | 15.4 | 13.7
bob /files/:id | 1.4 | 2.3 | 3.9 | 2.3
bob /clusters | 155.0 | 169.6 | 240.0 | 170.0
bob /clusters?limit=5 | 81.9 | 89.8 | 150.8 | 89.8
bob /clusters/:id (leaf) | 10.0 | 14.8 | 23.6 | 14.9
bob /clusters/:id (giant 33k) | 33.9 | 34.4 | 35.1 | 34.4
bob /clusters/:id (root) | 187.1 | 212.8 | 319.0 | 212.9
COLD (a distinct viewer per request) | TTFB p50 ms | p95 ms | p99 ms
bob /clusters WARM (25, cold excluded) | 156.9 | 241.8 | 241.9
COLD distinct viewers /clusters (40) | 203.3 | 215.7 | 279.1
COLD distinct viewers /files (40) | 13.0 | 14.4 | 20.1
COLD distinct viewers /clusters/:id (giant 33k) (40) | 33.0 | 61.8 | 75.2
COLD distinct viewers /clusters/:id (root) (40) | 199.0 | 212.4 | 216.2
DB query (real src/db builders, real fv_* indexes) | p50 ms | p95 ms | p99 ms | rows | plan nodes | indexes | ANALYZE
list modified desc p1 (alice) | 39.4 | 64.4 | 142.5 | 101 | Limit,Result,Sort,Nested Loop,Aggregate,Index Only Scan,Index Scan | edges_current,nodes_current | exec 41.89 ms, buffers hit 8023 read 0
list modified desc deep (alice) | 45.1 | 73.1 | 98.3 | 101 | Limit,Result,Sort,Nested Loop,Aggregate,Index Only Scan,Index Scan | edges_current,nodes_current | exec 25.086 ms, buffers hit 8023 read 0
list modified asc deep (alice) | 32.6 | 40.3 | 65.2 | 101 | Limit,Result,Sort,Nested Loop,Aggregate,Index Only Scan,Index Scan | edges_current,nodes_current | exec 38.141 ms, buffers hit 8023 read 0
list title asc deep (alice) | 10.5 | 11.2 | 11.8 | 101 | Limit,Sort,Nested Loop,Aggregate,Index Only Scan,Index Scan | edges_current,nodes_current | exec 10.088 ms, buffers hit 8023 read 0
list size desc deep (alice) | 96.0 | 109.6 | 179.1 | 101 | Limit,Result,Sort,Nested Loop,Aggregate,Index Only Scan,Index Scan | edges_current,nodes_current | exec 83.799 ms, buffers hit 8023 read 0
search title (alice) | 0.7 | 0.8 | 0.8 | 0 | Limit,Result,Sort,Nested Loop,Bitmap Heap Scan,Bitmap Index Scan,Index Only Scan | nodes_title_trgm,fv_readers | exec 0.233 ms, buffers hit 178 read 0
filter owner (alice) | 0.9 | 1.0 | 1.0 | 0 | Limit,Result,Sort,Hash Join,Index Scan,Hash,Index Only Scan | fv_doc_owner,edges_current | exec 0.534 ms, buffers hit 531 read 0
filter source+mime (alice) | 10.9 | 11.3 | 12.2 | 101 | Limit,Result,Sort,Hash Join,Index Scan,Hash,Index Only Scan | fv_doc_mime,edges_current | exec 10.383 ms, buffers hit 33760 read 0
filter modified range (alice) | 0.5 | 0.5 | 0.5 | 0 | Limit,Result,Sort,Hash Join,Index Scan,Hash,Index Only Scan | fv_doc_modified,edges_current | exec 0.011 ms, buffers hit 3 read 0
cluster members (leaf) (alice) | 1.6 | 1.6 | 1.7 | 3 | Limit,Result,Sort,Nested Loop,Aggregate,Index Only Scan,Index Scan | fv_members,nodes_current,fv_readers | exec 0.81 ms, buffers hit 586 read 0
cluster members (giant 33k) (alice) | 24.9 | 32.8 | 61.8 | 101 | Limit,Result,Sort,Nested Loop,Aggregate,Index Only Scan,Index Scan | edges_current,nodes_current,fv_members | exec 24.198 ms, buffers hit 14024 read 0
cluster members (all 2000 clusters) (alice) | 29.3 | 30.0 | 30.4 | 101 | Limit,Nested Loop,Index Scan,Index Only Scan | fv_doc_modified,fv_readers,fv_member_of | exec 23.292 ms, buffers hit 20486 read 0
list modified desc p1 (bob) | 2.9 | 4.3 | 13.2 | 101 | Limit,Nested Loop,Index Scan,Index Only Scan | fv_doc_modified,fv_readers | exec 2.307 ms, buffers hit 814 read 0
list modified desc deep (bob) | 2.9 | 3.5 | 4.4 | 101 | Limit,Nested Loop,Index Scan,Index Only Scan | fv_doc_modified,fv_readers | exec 2.463 ms, buffers hit 810 read 0
list modified asc deep (bob) | 2.7 | 6.1 | 10.7 | 101 | Limit,Nested Loop,Index Scan,Index Only Scan | fv_doc_modified,fv_readers | exec 2.312 ms, buffers hit 809 read 0
list title asc deep (bob) | 1.3 | 1.5 | 1.6 | 101 | Limit,Nested Loop,Index Scan,Index Only Scan | fv_doc_title,fv_readers | exec 0.88 ms, buffers hit 786 read 0
list size desc deep (bob) | 7.5 | 7.6 | 7.6 | 101 | Limit,Nested Loop,Index Scan,Index Only Scan | fv_doc_size,fv_readers | exec 7.058 ms, buffers hit 814 read 0
search title (bob) | 0.9 | 0.9 | 0.9 | 23 | Limit,Result,Sort,Nested Loop,Bitmap Heap Scan,Bitmap Index Scan,Index Only Scan | nodes_title_trgm,fv_readers | exec 0.436 ms, buffers hit 179 read 0
filter owner (bob) | 2.5 | 2.6 | 2.7 | 0 | Limit,Result,Sort,Nested Loop,Index Scan,Index Only Scan | fv_doc_owner,fv_readers | exec 2.151 ms, buffers hit 2008 read 0
filter source+mime (bob) | 2.4 | 2.4 | 2.5 | 101 | Limit,Nested Loop,Index Scan,Index Only Scan | fv_doc_mime,fv_readers | exec 1.879 ms, buffers hit 714 read 0
filter modified range (bob) | 0.4 | 0.4 | 0.5 | 0 | Limit,Nested Loop,Index Scan,Index Only Scan | fv_doc_modified,fv_readers | exec 0.009 ms, buffers hit 3 read 0
cluster members (leaf) (bob) | 1.9 | 2.0 | 2.0 | 55 | Limit,Result,Sort,Nested Loop,Aggregate,Index Only Scan,Index Scan | fv_members,nodes_current,fv_readers | exec 1.196 ms, buffers hit 586 read 0
cluster members (giant 33k) (bob) | 6.1 | 6.2 | 6.7 | 101 | Limit,Nested Loop,Index Scan,Index Only Scan | fv_doc_modified,fv_readers,fv_members | exec 5.398 ms, buffers hit 3289 read 0
cluster members (all 2000 clusters) (bob) | 9.0 | 9.2 | 9.4 | 101 | Limit,Nested Loop,Index Scan,Index Only Scan | fv_doc_modified,fv_readers,fv_member_of | exec 2.734 ms, buffers hit 1118 read 0
tree roots | 0.2 | 0.2 | 0.2 | 20 | Limit,Index Scan | fv_cluster_parent | exec 0.011 ms, buffers hit 5 read 0
tree children | 0.1 | 0.1 | 0.2 | 9 | Limit,Index Scan | fv_cluster_parent | exec 0.009 ms, buffers hit 7 read 0
tree subtree (20 roots) | 7.8 | 7.8 | 7.9 | 2000 | Aggregate,Recursive Union,Index Only Scan,Nested Loop,WorkTable Scan,Index Scan,CTE Scan | fv_cluster_id,fv_cluster_parent | exec 6.257 ms, buffers hit 5944 read 0
tree member ids (2000 clusters, cap 2 per cluster, bob) | 48.4 | 51.6 | 90.4 | 3600 | Nested Loop,Function Scan,Limit,Index Only Scan | fv_members,fv_readers | exec 49.135 ms, buffers hit 20793 read 0
paths: clusters of 100 files | 1.2 | 1.6 | 2.7 | 184 | Sort,Index Only Scan | fv_member_of | exec 0.748 ms, buffers hit 301 read 0
paths: cluster nodes | 0.7 | 0.9 | 1.7 | 100 | Index Scan | fv_cluster_id | exec 0.292 ms, buffers hit 203 read 0
```

## Browser

Real Chromium (Playwright) against the real server, JWT bearer, 1280 and 375 px, light and dark. axe-core: 0 violations on every page and scheme, no horizontal overflow at 375. Screenshots: todo/shots/ (files, file, clusters x light/dark x 1280/375).

## Fixes made

modified sort/cursor are bigint instants with matching index fv_doc_modified; non-ASCII q folds case via ICU; date range on instants; gate re-applied on cache hits (cache removed); per-file rechecks capped; /clusters bottleneck was quadratic JS in describe/members (fixed) plus a reader-driven member probe for small ACLs; added fv_doc_source and fv_doc_mime indexes; freePort fixed; seed fast; world built once; biome clean.

## NOT covered

- Worlds above 2,000 clusters (cap floors at 2, counts coarser).
- Non-ASCII search is unindexed (scan of readable candidates), not measured at 100k.
- Only Chromium; no Firefox/WebKit. axe cannot catch every a11y issue; no screen-reader run.
- Scale p95s vary run to run (run 5 saw warm /clusters p95 up to 242 ms in one sample); 300 ms limit held in every run.
- pnpm-lock.yaml changed by install; not reviewed beyond that.
