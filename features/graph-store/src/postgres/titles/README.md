# titles

`searchTitles` and `scanTitles` for Postgres, with the same rows, order and errors as the SQLite versions in `../../scan/`.

- `filter.ts`: `pgTitleFilter`, the shared WHERE (tenant, validity, `ILIKE`, kinds, optional `reachedBy` read-edge probe) with `$n` placeholders built as it goes. `COLLATE "C"` keeps the case fold to ASCII whatever the database locale. `%`, `_` and `\` are escaped so they match themselves.
- `search.ts`: `searchOps`, ordered by `id COLLATE "C"` (code-unit order, as SQLite) and paged by `after`.
- `scan.ts`: `scanOps`. Step 1 lists at most `cap` candidate `seq` values in order; step 2 checks them 256 at a time with `seq = ANY($1::bigint[])` plus the full filter and the JS `accept`. `seq` is the cursor, as `rowid` is on SQLite.

No `pg_trgm` index yet: candidates come from a per-tenant sequential scan, so a page costs at most `cap` matches but may read many non-matching rows. Add `CREATE INDEX ... USING gin (title gin_trgm_ops)` when a deployment needs it.
