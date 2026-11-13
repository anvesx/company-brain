# @anvesx/files-view

Customer-facing Files and Clusters screen: every document the connectors fetched (metadata only), the
clusters they were clubbed into, why each cluster exists, and keyset search/browse over them. Reads the
Postgres graph through `@anvesx/graph-store`; every read goes through `openGate` from `@anvesx/visibility`.
Server-rendered with `@anvesx/design-system`.

Acceptance spec: `todo/SPEC.md`. Lessons from earlier build episodes: `todo/SWARM.md`.

## Wiring

```ts
import { createFilesView, jwtAuth, migrate, pgGate } from "@anvesx/files-view";
await migrate(pool); // after the graph-store tables exist
const app = createFilesView({ pool, gate: pgGate(pool, { recheck }), auth: jwtAuth({ jwksUrl, issuer, audience }) });
```

Environment: `DATABASE_URL` (Postgres 16) plus the OIDC `jwksUrl`, `issuer`, `audience` passed to `jwtAuth`.

## Routes

`GET /files` (q, source, mime, owner, from, to, cluster, sort, dir, limit, cursor), `GET /files/:id`,
`GET /clusters`, `GET /clusters/:id`. Bearer token required. `Accept: application/json` returns JSON.

## Limits

Page size 25 (max 100). `q` up to 100 characters. Cursors are opaque and tied to one sort order. Members
are sampled per cluster (see below). Cluster tree depth 8. Dates are `YYYY-MM-DD` (whole day) or ISO instants.

## Removed state

`GET /files/:id` answers 404 in two ways. The "Access removed" page (still 404, no metadata) appears only when the viewer passes
tenant, zone and can-read rules for that id and the source's `recheck` now answers a clean `false`. Everything else is the generic
404, byte-identical to a missing id: never had access, other tenant, tombstoned, unknown id, and a recheck that throws or times out.
A viewer therefore learns nothing about files they never had a right to see.

## Cluster tree speed (no cache)

`GET /clusters` is computed live for every request. Nothing is cached, so a grant, revoke or recheck change shows on the next
request. A cache was dropped because it hid permission changes and was a cold-start cliff.

How it stays fast at 100k files and 2,000 clusters: members are read with one lateral query that takes at most `cap` ids per
cluster, where `cap = max(2, min(500, floor(3000 / clusters in the tree)))`. Children of a whole level load in one query, the tree
is built level by level, and one request reads each cluster's members once (shared memo). The gate approves only that bounded sample.

Consequence, stated plainly: when a cluster has at least `cap` member rows, its count is a lower bound and the page says
"at least N". Counts below the cap are exact. A cluster is dropped only when none of its sampled members is visible, and the
sample is ordered by file id, so a cluster with visible files hidden behind a fully hidden sample is read deeper (bounded).
Each request makes at most a fixed number of source rechecks, and a recheck for one file id runs once per request.

Measured through the real Hono app (100k files, 2,000 clusters, Postgres 16, bob sees about 50%, first request included):

| route                                          | before (exact counts, cold) | after (p50 / p95) |
| ---------------------------------------------- | --------------------------- | ----------------- |
| bob `GET /clusters` warm                       | 2200 to 2400 ms             | 152 / 155 ms      |
| bob `GET /clusters` cold (40 distinct viewers) | same                        | 198 / 210 ms      |
| bob `GET /clusters/c200`                       | about 216 ms                | 33 / 34 ms        |
| `GET /files` cold (40 distinct viewers)        |                             | 12.5 / 13.1 ms    |

The 300 ms p95 claim holds for cold and warm requests on this world. Not measured: worlds with more than 2,000 clusters
(the cap falls to its floor of 2 and counts become coarser). Search: ASCII queries use the trigram index; a query with
non-ASCII characters folds case with ICU and is not indexed, so it scans the viewer's readable candidates.
Tests build the 100k-file world once in `tests/scale/world.test.ts` (one file, because the shared vitest config has no
globalSetup option and ADR 0007 forbids a package config).

## Date filters

`from` and `to` are `YYYY-MM-DD` (whole day, UTC) or ISO instants (with or without offset; no offset means UTC). `to` includes its
whole second, millisecond or day. Filtering uses the `fv_ts` SQL function over the stored `modified` text, so rows with an
unparseable date never match a date filter.

## Fonts

The page uses its own document wrapper, not the design-system `Document`, because that one links a Google Fonts stylesheet that
this page's strict CSP blocks. Text uses the design-system font stack with system fallbacks. No third-party origin is contacted.

## Indexes

Created by `migrate`: `fv_doc_modified`, `fv_doc_title`, `fv_doc_size`, `fv_doc_owner`, `fv_doc_source`, `fv_doc_mime`, `fv_cluster_parent`,
`fv_cluster_id`, `fv_member_of`, `fv_members`, `fv_readers` (see `src/db/migrate.ts`).
`fv_members` is now `(tenant, to_id, from_id)` so the members query is an index-only ordered scan. A database migrated by an
earlier build keeps the old definition (`IF NOT EXISTS`): run `DROP INDEX fv_members` once, then `migrate` again.

## Not covered

Filter option lists are page-local. No total count. No sync timestamp. Request URLs above Node's header
limit get 431 from Node before the app runs.
