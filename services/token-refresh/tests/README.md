# tests

Acceptance tests for the token-refresh sweep. They were written before the code and are the
spec: builders make them pass and do not edit them.

| Folder or file | What it holds                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `helpers.ts`   | the real stack per test (identity, SQLite, replay provider), lease and token readers, a write recorder around the real adapter |
| `unit/`        | `selectDue` and `takeLease` / `releaseLease` against the real adapter                                                          |
| `integration/` | whole sweeps through `identity.refreshAccount` and the replay provider, two replicas at once                                   |
| `scale/`       | 10 000 rows in under 10 seconds, run by `pnpm --filter @anvesx/token-refresh scale`                                            |

The replay provider and seeding helpers live in
`features/identity/tests/support/replay/` and are imported by relative path, so this package
tests the identity source, not a built copy.
