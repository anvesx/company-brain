# lease

Keeps two refreshers off one account row. Shared by the on-demand refresh and `services/token-refresh`.

- `lease.ts`: `takeLease` and `releaseLease`, one conditional write for a batch; `dueWhere`, the 30 minute window and 2 minute lease. A row is free when its lease end is in the past or NULL (a row written outside the adapter has NULL). `anyExpiry` leases a row that is not due.
- `store.ts`: `createStore`, reads and writes of one account row. Any database error becomes `RefreshError("STORE_FAILED")`.
- `demand.ts`: `underLease` (run work only if we win the row's lease, always release it) and `port.accessToken`. One refresh per account per process, a lease against other processes, `LEASED` when another holds it. `refreshAccount` uses `underLease` too when called directly; the sweep passes rows it already leased, so it takes none.
- `open.ts`: `openSqlite`, the one way to open the SQLite file. It sets a busy timeout so a second writer waits instead of failing.
