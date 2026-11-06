# tests/support/process

Runs real second node processes against the test's SQLite file, to prove what one process cannot:
that two replicas do not both refresh one account.

| File        | Holds                                                                                                                      |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| `child.mjs` | One replica: opens the file with `openSqlite` and calls `refreshAccount` once                                              |
| `spawn.ts`  | `refreshInProcesses`: starts n children, parks the first provider refresh until the others exit, returns what each printed |

The overlap is forced through `replay.state.hold`, not timed: a child that starts late on a loaded machine still finds
the lease taken. The children load the built package, so run `pnpm --filter @anvesx/identity build` before the tests.
