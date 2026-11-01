# Libraries for L0 and L1: ingest and freshness

Checked on 2026-11-01 with `npm view` and `gh api`. Node 26 is the target. Engines checked: pg-boss >=22.12, better-sqlite3 >=22, Hatchet SDK >=22, Temporal >=20.3, Nango >=20, Inngest >=20, BullMQ >=14.18. drizzle-orm lists no engines field.

Stars and push dates come from the GitHub repo named in the notes. "unverified" means we did not run a command to confirm it.

## 1. SaaS connectors (OAuth, delta sync, webhooks)

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| @nangohq/node (NangoHQ/nango) | 0.71.14 | Elastic License 2.0 (npm says "see file") | 13073 | 2026-10-30 | Pick. OAuth, token refresh, syncs, webhook forwarding. |
| Airbyte (airbytehq/airbyte) | no npm SDK found (404) | Elastic License 2.0 | 22295 | 2026-11-01 | Skip. Warehouse ELT, heavy platform, not per-document pointers. |
| @composio/core | 0.27.0 | ISC (repo MIT) | 30863 | 2026-11-01 | Skip for ingest. Built for agent tool calls, not bulk delta sync. Useful later for L4 write actions. |

PICK: `@nangohq/node@0.71.14`

Why: it owns OAuth, token refresh and per-app sync scripts, which is most of L0 connector work.

Integration note: we write a thin `Connector` adapter. It maps a Nango sync record to a pointer row (address, version, content hash, ACL version) and drops the body. Risk: ELv2 bars offering Nango as a hosted service to others. Legal must confirm our use is internal product use. Self-host details are unverified.

## 2. Pointer registry (one row per document, no body text)

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| drizzle-orm (drizzle-team/drizzle-orm) | 0.45.4 | Apache-2.0 | 36197 | 2026-10-30 | Pick. Typed schema and migrations. |
| kysely | 0.29.8 | MIT | unverified | unverified | Alternative. Query builder only. |
| better-sqlite3 (WiseLibs/better-sqlite3) | 13.0.3 | MIT | 7540 | 2026-08-10 | Dev and tests only. Native build, single writer. |
| pg | 8.23.1 | MIT | unverified | unverified | Driver under drizzle. |

PICK: `drizzle-orm@0.45.4` with `pg@8.23.1` on Postgres.

Why: one Postgres also hosts the queue and workflows below, so there is one store to run and back up.

Integration note: we write the schema file for `pointer` (unique on app, external id), `cursor`, `tombstone`. A CI scan asserts no column holds body text. Use better-sqlite3@13.0.3 only for local unit tests.

## 3. Webhook doorbells

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| Nango webhook forwarding (same package as section 1) | 0.71.14 | Elastic License 2.0 | 13073 | 2026-10-30 | Pick for apps Nango covers. Behavior unverified. |
| svix (svix/svix-webhooks) | 2.9.1 | MIT | 3473 | 2026-11-01 | Use `Webhook.verify` for signature checks. Sender platform, we do not need it. Verify API unverified. |
| Per-app verifiers (Slack, GitHub) | n/a | n/a | n/a | n/a | Fallback. Unverified. |

PICK: `svix@2.9.1` for signature verification only, plus Nango forwarding.

Why: a doorbell only needs verify, ack in under a second, enqueue.

Integration note: we write one `POST /hooks/:app` route. It verifies, writes a `doorbell` job id keyed by event id, returns 200. The body is never trusted. The job re-fetches the document.

## 4. Event bus

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| pg-boss (timgit/pg-boss) | 12.38.0 | MIT | 4117 | 2026-11-01 | Pick. Postgres only. Pub/sub support is unverified, check the docs. |
| nats + JetStream (@nats-io/jetstream, nats-io/nats-server) | 3.4.0 | Apache-2.0 | 20978 (server) | 2026-10-31 | Later. Needs a new server to run. Right at 10 apps and 100k docs? No. |
| bullmq (taskforcesh/bullmq) | 6.5.3 | MIT | 9566 | 2026-11-01 | Needs Redis. Extra moving part. |

PICK: `pg-boss@12.38.0`

Why: at 100,000 documents and one worker pool, a Postgres queue is enough. No Redis or broker.

Integration note: we write an `EventBus` interface (`publish`, `subscribe`) with a pg-boss adapter. A NATS adapter can replace it if volume grows.

## 5. De-duplication, delta cursors, scheduled polling, reconciliation sweep

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| pg-boss (same as section 4) | 12.38.0 | MIT | 4117 | 2026-11-01 | Pick. Cron schedules and singleton keys for de-dup. Both unverified in v12, check docs. |
| graphile-worker (graphile/worker) | 0.18.0 | MIT | 2432 | 2026-10-20 | Alternative. Cron and job keys. Pre-1.0. |
| bullmq | 6.5.3 | MIT | 9566 | 2026-11-01 | Repeatable jobs, Redis required. |

PICK: `pg-boss@12.38.0`

Why: it covers both jobs and schedules, so we add no package.

Integration note: de-dup is two layers. The job key is `app:docId:version` at enqueue. The pointer upsert compares content hash and skips no-ops. We write the cursor store (a table) and the sweep job. The sweep lists each app, diffs against pointers, and enqueues misses. No library does this for us.

## 6. Durable workflows

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| @dbos-inc/dbos-sdk (dbos-inc/dbos-transact-ts) | 5.4.0 | MIT | 1427 | 2026-10-31 | Pick. Library only, state lives in Postgres. |
| @temporalio/worker + client | 1.25.0 | MIT | 945 (TS SDK), 24118 (server) | 2026-10-31 | Strongest, but needs a Temporal cluster. Overkill at 10 apps. |
| @hatchet-dev/typescript-sdk (hatchet-dev/hatchet) | 1.46.0 | MIT | 8211 | 2026-11-01 | Needs the Hatchet engine service. Fine later. |
| inngest | 4.26.2 | Apache-2.0 on npm. Repo license unconfirmed: inngest-js shows GPL-3.0 by API, server is SSPL with Apache future license | 6010 (server) | 2026-11-01 | Skip. License is unclear. |

PICK: `@dbos-inc/dbos-sdk@5.4.0`

Why: durable steps with no extra server, in the same Postgres. It fits "build almost nothing".

Integration note: we write `syncDocument` as one workflow with steps fetch, hash, upsert pointer, emit event. Idempotency key is the job key from section 5. If DBOS and pg-boss feel redundant at build time, drop DBOS and use pg-boss retries. Not yet tested on Node 26 (unverified).

## 7. Tombstones for deletes

| Candidate | Version | License | Stars | Last push | Verdict |
|---|---|---|---|---|---|
| drizzle-orm (same as section 2) | 0.45.4 | Apache-2.0 | 36197 | 2026-10-30 | Pick. Soft-delete columns in our schema. |
| Nango deleted-record flags | 0.71.14 | Elastic License 2.0 | 13073 | 2026-10-30 | Source of delete signals. Exact shape unverified. |

No library owns this. It is a table design.

PICK: `drizzle-orm@0.45.4` (no new package)

Why: a tombstone is a pointer row with `deleted_at` and a reason, kept for audit and erasure proof.

Integration note: we write `markDeleted(pointerId, source)`. The sweep also tombstones documents that vanish from a full listing. Nothing is hard-deleted until the L5 erasure window.

## Summary of picks

- `@nangohq/node@0.71.14` (connectors)
- `drizzle-orm@0.45.4` and `pg@8.23.1` (registry, cursors, tombstones)
- `svix@2.9.1` (webhook verify)
- `pg-boss@12.38.0` (bus, de-dup, schedules, sweep)
- `@dbos-inc/dbos-sdk@5.4.0` (durable workflows)

Open items: Nango ELv2 legal review, pg-boss pub/sub and cron behavior on v12, DBOS on Node 26, svix verify API.
