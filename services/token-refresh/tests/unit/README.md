# tests/unit

The two building blocks of the sweep, each against a real better-auth adapter over a fresh SQLite
file (see `../helpers.ts`). No HTTP refresh happens here.

| File             | Rules                                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------------------- |
| `select.test.ts` | 5: the 30-minute window at 29:59 and 30:01, no expiry, needs-auth, leased rows, paging by id                   |
| `lease.test.ts`  | 5: 2-minute lease, one millisecond either side, release by owner only, still-due check, one write per 500 rows |
