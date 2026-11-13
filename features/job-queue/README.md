# @anvesx/job-queue

Durable job queue for Company Brain. It wraps pg-boss 12.38.2 (MIT) on Postgres 16 behind the small
`JobQueue` port in `src/types.ts`. Only `src/queue/boss.ts` imports pg-boss. Decision record:
`docs/adr/product/0013-job-queue-on-pg-boss.md`.

## Use

```ts
import { createJobQueue } from "@anvesx/job-queue";

const queue = await createJobQueue({ connectionString: process.env.DATABASE_URL!, maxBacklogPerTenant: 10_000 });
await queue.register("connector.poll", { recoverySeconds: 30 });
await queue.work("connector.poll", async (job) => {
  /* job.tenant, job.data, job.attempt */
});
await queue.enqueue("connector.poll", "tenant-a", { source: "drive" }, { key: "poll-2026-11-13T10" });
await queue.stop(30_000); // graceful: running handlers finish first
```

| Need                  | How                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------- |
| Retries with back-off | 5 retries, 2 s doubling up to 300 s (per-queue policy in `src/queue/map.ts`)              |
| Dead letter           | failed-out jobs land in `<queue>_dlq`; read with `queue.deadLetters(name)`                |
| Idempotency           | `key` becomes a deterministic job id; a repeat enqueue inside the dedupe window is null   |
| Fairness              | `tenantConcurrency` caps running jobs per tenant across all nodes                         |
| Back-pressure         | `maxBacklogPerTenant` makes `enqueue` throw `BackpressureError`                           |
| Crash recovery        | a killed worker stops heartbeating (minimum 10 s) and its job is retried                  |
| Cron                  | `registerSchedules` in `src/ops/schedules.ts` (poll 15 min, sweep daily, cluster nightly) |
| Shutdown              | `stopOnSignals(queue, done, ms, ["SIGTERM", "SIGINT"])` stops gracefully                  |

## Limits to know

- Two separate guarantees. Enqueue de-duplication: a repeated `key` returns null and never runs
  again while the first job row is retained, `dedupeWindowSeconds` (queue policy, default 7 days
  after completion); after the window the same key is new work. Delivery: an accepted job runs at
  least once. A handler that finishes its side effect and dies before the ack runs again, so
  handlers must be idempotent. Neither one is exactly-once.
- Back-pressure reads at most `maxBacklogPerTenant` index entries, using the
  `job_backlog_guard (name, group_id, state)` index created at boot when the limit is set.

## Test

Tests run against a real Postgres 16. Without `DATABASE_URL` the integration tests skip locally
(they fail in CI).

```sh
export PATH=/opt/homebrew/opt/postgresql@16/bin:$PATH LC_ALL=en_US.UTF-8 NODE_AUTH_TOKEN=x
initdb -D /tmp/jq-pg-55437 -U postgres --auth=trust && pg_ctl -D /tmp/jq-pg-55437 -o "-p 55437 -c max_connections=300" -l /tmp/jq-pg.log start
export DATABASE_URL=postgres://postgres@127.0.0.1:55437/postgres
pnpm install && pnpm --filter @anvesx/job-queue test
```

The suite takes about five minutes: it includes a real minute-boundary cron wait, a 100,000-job
backlog and a 20 s load at 1,000 jobs per second.
