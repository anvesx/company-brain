# tests

Tests for `@anvesx/graph-store`. Real SQLite files in a temp directory and a real throwaway Postgres server; no mocks.

- `unit/`: tenant isolation, as-of reads, supersession, edges, reach, validation and lifecycle.
- `integration/`: reopen persistence, WAL cleanup, two OS processes writing one file, and the 10k node / 50k edge reach timing test (2 s CI budget; the spec target is 200 ms).
- `contract/`: the dialect-neutral contract, run on SQLite and on Postgres (one `describe` per factory).
- `postgres/`: concurrent writers, killed transactions and server restarts, Postgres only.
- `support/`: shared helpers (temp store, node and edge factories).
