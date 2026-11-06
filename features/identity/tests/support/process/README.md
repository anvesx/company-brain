# tests/support/process

Runs real second node processes against the test's SQLite file, to prove what one process cannot:
that two replicas do not both refresh one account.

| File        | Holds                                                                               |
| ----------- | ----------------------------------------------------------------------------------- |
| `child.mjs` | One replica: opens the file with `openSqlite`, calls `refreshAccount` at `START_AT` |
| `spawn.ts`  | `refreshInProcesses`: starts n children at once and returns what each printed       |

The children load the built package, so run `pnpm --filter @anvesx/identity build` before the tests.
