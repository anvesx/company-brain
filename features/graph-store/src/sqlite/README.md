# sqlite

- `open.ts`: the DDL and `openDb` (WAL, busy timeout, retry of the concurrent WAL switch, `:memory:` guard). It also reads old titles into the index once, when the index is first created.
- `titles.ts`: the FTS5 trigram index over `nodes.title` and the triggers that keep it current.

## For the Postgres store

`searchTitles` (see `../search.ts`) must return the same rows on Postgres: current-or-`asOf` nodes of one tenant whose
title contains the text (ASCII case-insensitive, `%` `_` `\` literal), optional `kinds`, `id > after`, ordered by id, at most `limit`.
Use the `pg_trgm` extension: `CREATE EXTENSION pg_trgm; CREATE INDEX nodes_title_trgm ON nodes USING gin (title gin_trgm_ops);`
then `WHERE title ILIKE '%' || $text || '%'` with the text escaped for LIKE. The trigram index serves `ILIKE` for 3 or more characters, like SQLite's here.

`scanTitles` (see `../scan/`) is the same filter, ordered by insertion order and capped by candidates. On Postgres use a `bigserial` column in place of `rowid` for the cursor, and `reachedBy.only` becomes `kind <> $only OR EXISTS (...)`.
