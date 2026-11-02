# integration

Tests against a real SQLite file in the OS temp directory, removed after each test.

- `file.test.ts`: data survives close and reopen, the raw file bytes contain no title or body text, the `docs` table has only pointer and count columns, 300 docs match the oracle through the file, and reopening does not wipe the schema.
- `connections.test.ts`: a second connection reads whole index batches while the first writes, a revoke made on one connection applies to the next search on another, and interleaved async calls on one handle never expose half a batch.

- `internals.test.ts`: the file is in WAL mode, and the `probe` callback reports each search stage once, in order, and stops early on an empty query or an empty index. Re-indexing the same docs and removing some keeps working. This is the Linux CI regression: after an FTS5 delete SQLite leaves a `last_insert_rowid` above 2^53 and Node 26.13 throws on it. It fails without the fix only on Linux.

Concurrency coverage is limited to what one Node thread can do: interleaving at `await` points, and two handles on one WAL file taking turns. It does not race two OS threads.
