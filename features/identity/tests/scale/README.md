# scale

Rule 15, with timings and counts printed to the test log.

- `verify.test.ts`: 10,000 bearer verifications under 1 s with no extra key set fetch; the key
  set is refetched after an hour, or for an unknown key id once a one-minute cooldown has passed.
- `attack.test.ts`: forged key ids. 1000 in a row cost 1 fetch, 200 at once share 1 fetch, and 50
  unauthenticated calls to `/mcp` cost 0 fetches and leave a proven token valid.
- `session.test.ts`: records the SQL a session lookup really runs and runs `EXPLAIN QUERY PLAN`
  on each: no `SCAN`, every read is a `SEARCH` by index or primary key.
- `signin.test.ts`: 1,000 sign-ins against SQLite under 20 s at concurrency 8.

The sign-in target depends on the password hash cost on the machine running it. On the
author's laptop under load one hash took about 80 ms serial, so the target is tight; the
printed per-sign-in time shows the margin.
