# integration

Real file databases, no mocks.

- `durable.test.ts`: the file is created on first open, opened in WAL mode, and cursors, seen ids and their ttl survive a reopen.
- `race.test.ts`: four concurrent workers on one file; exactly one sees each id as new, and tenants stay apart under contention.
- `seen-tenant.test.ts`: `seen` is scoped by tenant, and expired rows are pruned.
