# sqlite

`open.ts`: the SQLite DDL and `openDb`. It opens the file, switches to WAL, sets the busy timeout, retries the concurrent WAL switch and refuses `:memory:` outside tests.
