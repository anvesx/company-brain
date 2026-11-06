# sqlite

- `open.ts`: the SQLite DDL and `openDb` (WAL, busy timeout, retry of the concurrent WAL switch, `:memory:` guard). It also reads old titles into the index once, when the index is first created.
- `titles.ts`: the FTS5 trigram index over `nodes.title` and the triggers that keep it current.

The Postgres twin of the title search is in `../postgres/titles/` (see its README entry); both run the same contract tests.
