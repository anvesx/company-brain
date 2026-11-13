# queue

`boss.ts` wraps pg-boss and implements the `JobQueue` port. `work.ts` runs fetched batches and
settles each job on its own. `ids.ts` derives idempotency ids. `map.ts` turns library rows into port
shapes and builds queue options.
