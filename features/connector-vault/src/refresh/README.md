# refresh

`lease.ts` takes and frees a database-clock lease and marks needs-auth. `exchange.ts` is the refresh_token grant over fetch and
sorts failures into AuthError (grant dead) and TransientError (try again). `refresh.ts` refreshes one row with retries; only
AuthError forces re-consent. `sweep.ts` pages due rows by (expires_at, id) and refreshes them.
