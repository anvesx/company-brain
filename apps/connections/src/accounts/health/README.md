# accounts/health

`health.ts`: how an account's syncs are going, kept in two extra columns beside the account row (`fail_count`, `last_error`) plus an in-memory set of runs in progress. `store.health` exposes it; the sync route records each outcome, the pages read it. It is not part of the Account API shape.
