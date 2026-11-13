# jobs

Automatic sync. After an account is connected it is synced by background jobs, not by a click.

- `queue.ts`: `startJobs(deps, config)` starts pg-boss through `@anvesx/job-queue` on the same Postgres as the vault. Queue `connections.sync` runs one account sync per job (`tenantConcurrency` at once per tenant, `maxBacklogPerTenant` waiting); queue `connector.poll` is a cron job that runs `tick`. `requestSync` queues one sync now; it returns false when a full backlog drops it (the next poll covers it).
- `sync-job.ts`: the handler. It calls `syncAccount`, the same code as Sync now. A source failure throws so the queue retries with backoff (4 retries, 5 s growing to 10 min); the last failure is dead-lettered to `connections.sync_dlq` and the account's health says `gave up`. Reauth, bad input and a deleted account end the job quietly.
- `tick.ts`: the polling fallback. One job per stale active account, keyed `poll:<id>:<time bucket>` so replicas do not double-queue. The change cursor (time of the last successful sync) skips accounts that synced within the interval.
- `env.ts`: the Postgres and job settings from the environment.

Triggers: OAuth callback (`connected`), repo change, GitHub webhook (`webhook`), the poll. Health per account: last run, failures in a row, last error, `needs-auth` when the provider rejects the credential.
