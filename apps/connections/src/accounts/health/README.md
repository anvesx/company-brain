# accounts/health

`health.ts`: how an account's syncs are going, kept in extra columns beside the account row (`fail_count`, `last_error`, `last_run_at`) plus an in-memory set of runs in progress. `store.health` has `read`, `ok`, `failed`, `begin`, `end`. `syncAccount` records each outcome (Sync now and the jobs alike); the pages read it, which is how the page shows Syncing, Healthy, Error and the last run. It is not part of the Account API shape.
