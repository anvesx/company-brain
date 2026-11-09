# titles

`searchTitles` and `scanTitles` for Postgres, with the same rows, order and errors as the SQLite versions in `../../scan/`.

- `filter.ts`: `pgTitleFilter`, the shared WHERE (tenant, validity, `ILIKE`, kinds, optional `reachedBy` read-edge probe) with `$n` placeholders built as it goes. `COLLATE "C"` keeps the case fold to ASCII whatever the database locale. `%`, `_` and `\` are escaped so they match themselves.
- `search.ts`: `searchOps`, ordered by `id COLLATE "C"` (code-unit order, as SQLite) and paged by `after`.
- `scan.ts`: `scanOps`. Step 1 lists at most `cap` candidate `seq` values in order; step 2 checks them 256 at a time with `seq = ANY($1::bigint[])` plus the full filter and the JS `accept`. `seq` is the cursor, as `rowid` is on SQLite.

## Cost model

`../schema.ts` creates the `pg_trgm` extension, a GIN index `nodes_title_trgm` on `title COLLATE "C" gin_trgm_ops`, and a btree `nodes_tenant_seq` on `(tenant, seq)`. Opening a store where the extension cannot be created rejects with GraphError `SETUP`.

- A needle of 3+ characters that matches few rows: step 1 and the search read the trigram index (Bitmap Index Scan), then only the rows it points at. Cost follows the number of matches, not the tenant's size. `tests/postgres/titles/plan.test.ts` checks the plans with EXPLAIN over 60k rows.
- A needle under 3 characters has no trigram, and a needle that matches most rows is cheaper to answer by reading the table, so the planner may still scan the whole tenant. `cap` bounds what one scan returns, not what Postgres reads to find it.
- Building the index on an existing large table holds a write lock while it runs, once, on the first start after upgrade.

## Known limit: the cursor is not a change feed

`seq` is assigned when an INSERT starts, not when it commits. A transaction that took seq 5 but commits after a reader got `next: 7` is never shown on that reader's later pages, because they ask for `seq > 7`. A new scan from the start finds it. `scanTitles` pages are for discovery; do not use them to sync changes. `tests/postgres/titles/cursor.test.ts` pins this.
