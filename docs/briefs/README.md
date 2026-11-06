# Builder briefs

One brief per builder session. A brief names the goal, the files the builder owns, the public
interface with real signatures, the acceptance tests that were written first, and the commands
that prove it is done. The tests are the spec: a builder makes them pass and never edits them.

| Brief | Slice | Tests |
|---|---|---|
| [connector-accounts](connector-accounts.md) | connector accounts, token refresh sweep, Google login | `features/identity/tests/{unit/connectors,integration/connectors,integration/google}`, `services/token-refresh/tests` |
