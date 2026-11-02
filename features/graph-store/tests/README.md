# tests

Tests for `@brain/graph-store`. All of them use real SQLite files in a temp directory; no mocks.

- `unit/`: tenant isolation, as-of reads, supersession, edges, reach, validation and lifecycle.
- `integration/`: reopen persistence, WAL cleanup, two OS processes writing one file, and the 10k node / 50k edge reach timing test (2 s CI budget; the spec target is 200 ms).
- `support/`: shared helpers (temp store, node and edge factories).
