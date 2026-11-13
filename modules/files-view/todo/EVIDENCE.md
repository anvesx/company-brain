# files-view evidence

Command: `timeout 900 pnpm --filter @anvesx/files-view test` (env: PATH with postgresql@16, NODE_AUTH_TOKEN=x,
LC_ALL=en_US.UTF-8, DATABASE_URL on port 55496). Real Postgres 16, real Hono app, real JWKS and pgGate. No stubs.

## Test tail

```
 Test Files  51 passed (51)
      Tests  540 passed (540)
   Duration  313.73s (tests 97%, import 3%)
Statements   : 98.71% ( 1153/1168 )
Branches     : 94.19% ( 600/637 )
Functions    : 98.06% ( 355/362 )
Lines        : 99.44% ( 896/901 )
real 5m14.437s
exit 0
```

0 skipped, 0 errors. `pnpm structure`, `pnpm deps` (no violations), `pnpm guard:fakes` (4 findings, 1 baselined), tsc, biome: all exit 0.
`rg OFFSET src`: no match.

## World

150,000 files for tenant t1 (plus 25,000 for tenant t2), 3,000 clusters, 519,859 edges, seeded in 29 s.
Viewers: alice about 47% visible, bob 50%, carol 14% (21k), erin 2% (3k).

## HTTP TTFB, 40 sequential requests per path, every viewer (p95 ms, all <= 300)

Every response is asserted non-empty (a row link is present), so no row measures an empty page.

| path | erin | alice | carol | bob |
| --- | --- | --- | --- | --- |
| /files | 59.3 | 14.2 | 18.6 | 18.5 |
| /files?sort=title | 72.4 | 12.7 | 17.7 | 15.6 |
| /files?sort=size | 72.6 | 28.1 | 29.1 | 27.9 |
| /files?q= (needle) | 24.7 | 42.2 | 33.1 | 43.2 |
| /files?owner= | 10.8 | 11.5 | 12.2 | 10.1 |
| /files?owner=&sort=size | 22.4 | 20.7 | 17.5 | 20.0 |
| /files?source=&mime= | 37.9 | 11.9 | 17.2 | 10.4 |
| /files?source=&sort=title | 35.0 | 8.9 | 14.0 | 7.6 |
| /files?from=2026-01-03&to=2026-01-06 | 124.8 | 13.7 | 25.0 | 13.6 |
| /files?cluster=c5&sort=size | 56.3 | 123.3 | 93.7 | 94.1 |
| /files?cluster=c5&sort=title | 56.8 | 109.2 | 72.9 | 91.7 |
| /files?cluster=c300 (giant) | 71.9 | 41.7 | 64.6 | 40.4 |
| /files/:id | 2.1 | 1.9 | 1.9 | 1.9 |
| /clusters | 150.3 | 189.5 | 264.4 | 171.5 |
| /clusters/:id (leaf) | 9.7 | 15.4 | 13.7 | 14.7 |
| /clusters/:id (c5) | 56.9 | 156.7 | 170.3 | 116.5 |
| /clusters/:id (giant 50k) | 70.4 | 42.2 | 69.8 | 40.8 |
| /clusters/:id (root) | 58.9 | 195.8 | 171.0 | 224.7 |

`/files?cluster=c5&sort=size` is 56 to 123 ms for all four viewers (limit 300). Cold, distinct viewer per request (40):
`/clusters` p95 196.1, `/files` 14.2, `/clusters/:id` giant 39.7, root 258.9. bob `/clusters` first request cold 196.6 ms,
warm p95 (25 requests, cold excluded) 168.7.

## Database plans (EXPLAIN ANALYZE, real src/db builders)

Index scans only: composite per-sort indexes `fv_doc_{source,mime,owner}_{title,size}` and `fv_doc_modified/title/size`,
with `fv_readers` or `fv_members` for the permission check. The test fails on any Sort node over more than 20,000 rows
and on any Seq Scan of nodes or edges, except the reader-driven cluster-subtree case for erin and carol (see below).
Non-ASCII search uses `fv_title_icu` (pg_trgm GIN on an ICU lower expression): "école" erin 5.5 ms, alice 38.2 ms;
"Übersicht" erin 17.4 ms, alice 29.3 ms. Examples: mime by size (alice) `Limit,Index Scan,Index Only Scan` 7.7 ms;
owner by size (bob) 7.0 ms; c5 subtree by size (bob) 31.4 ms with `fv_doc_size,fv_member_of`.

## Thinnest margins and caveats

- erin date range: p95 124.8 ms in this run (274.6 ms in an earlier run). It walks the date index over her 2% of files, so it
  is the thinnest margin.
- carol `/clusters` p95 264.4 ms and bob `/clusters/:id (root)` 224.7 ms are under 300 with under 25% margin.
- The c5 subtree plan for erin and carol is chosen by the planner and varies run to run (hash join with a parallel scan of nodes,
  or nested loops over fv_members). Both stay under the 150 ms p95 check (40 to 110 ms measured). The Seq Scan assertion is waived
  for that reader-driven case only.
- A viewer with no visible file under a source or mime filter pays a full-index walk (about 190 ms at DB level in an earlier run
  for bob with source=slack). Not in the table because it returns no rows.
- `/clusters` shows 3 levels only while a level has at most 30 groups; wider levels stop growing and deeper groups open from
  their own page. Counts are sampled ("at least N" when capped); the member budget is 2400 ids per read.
- Iteration counts are reduced to fit the 900 s gate: HTTP 40 requests, DB 40, gated 60, cold 40 viewers.
- Machine load varied between runs (load average 3 to 9); one earlier run failed alice `/clusters/:id (c5)` at 322 ms under load.

## UI evidence

Screenshots in `todo/shots` (1280 and 375 px, light and dark; files, file, clusters). At 375 px the filters collapse behind
a "Filters" summary so results come first; date inputs show a focus ring including the calendar picker; the /clusters tree
folds with native details and shows "N files" on counts. axe-core (HTTP and Chromium, contrast included): 0 violations.

## NOT covered

- Worlds above 150k files or 3,000 clusters; more than 4 viewer shapes; concurrent load (requests are sequential).
- A cold Postgres cache (buffers are warm; "read 0" in the plans).
- Real connector data shapes beyond the seeded props; non-UTC date inputs.
- Production hardware: numbers are from one laptop.
