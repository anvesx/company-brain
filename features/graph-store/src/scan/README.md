# scan

`scanTitles(tenant, q)`: a bounded, rowid-ordered title scan for callers who filter further in JS.

- `filters.ts`: `titleFilter`, the shared WHERE (tenant, validity, LIKE ESCAPE, kinds, optional read-edge probe via `reachedBy.only`).
- `search.ts`: `searchOps`, `searchTitles` (a literal, ASCII-case-insensitive match over current titles, ordered by id, paged by `after`) and its SQL.
- `scan.ts`: `scanOps`. Step 1 lists candidate rowids from the FTS trigram index (or `nodes` for needles under 3 characters), at most `cap` (default 4,096). Step 2 checks them in chunks of 256 with `nodes NOT INDEXED` (without it SQLite picks a history index and a chunk costs about 20 times more) plus the JS `accept` predicate.
- Stops when `limit` rows are found (`next` = last row, `truncated` false), after `cap` candidates (`truncated` true), or when candidates run out (no `next`). `cursor` is a rowid.
