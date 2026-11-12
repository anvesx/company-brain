# Tests

Integration tests run the public API against real Postgres 16. They cover empty and graph-store-shaped
schemas, forced tenant RLS and checksum drift. `support.ts` creates one isolated schema per
test and refuses a server whose major version is not 16.
