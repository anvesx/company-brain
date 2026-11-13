# tests/jobs

The background jobs on real Postgres (pg-boss, vault) and a local GitHub that replays recorded JSON.

| File              | Proves                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| `fixture.ts`      | `bootJobs()`: real `Deps` with a graph, a vault, cursors and a replay GitHub                            |
| `handler.test.ts` | the sync job: done, retry on failure, dead-letter health text, quiet end on reauth or a deleted account |
| `tick.test.ts`    | the poll: skips fresh cursors, one job per account per bucket, back-pressure counted as skipped         |
| `queue.test.ts`   | `requestSync` is idempotent per key and a full backlog drops it without throwing                        |
