# 0013: Durable job queue on pg-boss behind a port

Status: accepted, 13 Nov 2026. Implements WP-13 and checklist item JQ-01.

## Decision

`@anvesx/job-queue` wraps pg-boss 12.38.2 on Postgres 16. Callers import the `JobQueue` port from
`features/job-queue/src/types.ts`; one file, `src/queue/boss.ts`, imports the library. If pg-boss
stops fitting, only that file changes.

## What was verified before install

- Licence: the `LICENSE` file inside the published tarball (`npm pack pg-boss@12.38.2`, read in full)
  is the MIT licence, Copyright (c) 2016 Tim Jones. `package.json` also says `"license": "MIT"`.
- Registry listing: `npm view pg-boss` on the public npm registry shows name `pg-boss`, version
  12.38.2, licence MIT, repository github.com/timgit/pg-boss, one maintainer. It is not on the
  `@anvesx` GitHub Packages registry; it installs from npm like any unscoped dependency.
- Runtime: `engines.node` is `>=22.12.0`; this repo requires Node 22 or later. Tested here on Node
  26.0.0 and Postgres 16.15.
- Dependencies: `pg`, `cron-parser`, `rrule-temporal`, `serialize-error`; optional peer
  `@opentelemetry/api`.

## How the requirements map onto it

| Need | Mechanism |
| --- | --- |
| Retries with back-off | queue options `retryLimit`, `retryDelay`, `retryBackoff`, `retryDelayMax` |
| Dead letter | each queue gets `<name>_dlq`; failed-out jobs move there with the error kept |
| Idempotency | job id is a UUID derived from queue, tenant and key; a duplicate insert is refused |
| Per-tenant fairness | tenant is the job group; `groupConcurrency` caps running jobs per tenant |
| Crash recovery | queue `heartbeatSeconds`; a worker that stops heartbeating has its job retried |
| Graceful shutdown | `stop({ graceful: true, timeout })` waits for running handlers |
| Cron | `schedule()` |

## Consequences

- Delivery is at least once. A handler that finished its side effect and died before the ack runs
  again, so handlers must be idempotent. "Exactly once" in the checklist means one completion.
- Idempotency lasts as long as the job row is retained (7 days after completion by default).
- pg-boss owns its tables in a separate schema (`pgboss`) and runs its own migrations on start.
