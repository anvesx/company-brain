# scan

`scanTitles(tenant, q)`: a bounded, rowid-ordered title scan for callers who filter further in JS.

- `filters.ts`: `titleFilter`, the shared WHERE (tenant, validity, LIKE ESCAPE, kinds, optional read-edge probe via `reachedBy.only`).
- `search.ts`: `searchOps`, `searchTitles` (a literal, ASCII-case-insensitive match over current titles, ordered by id, paged by `after`) and its SQL.
- `scan.ts`: `scanOps`. Step 1 lists candidate rowids of this tenant whose title matches LIKE (any validity), from the FTS trigram index plus a rowid lookup (or a walk of `nodes` for needles under 3 characters), at most `cap` (default 4,096). This is the same candidate list Postgres builds, so both dialects cut identical pages (`tests/contract/titles/parity.test.ts`). Step 2 checks them in chunks of 256 with `nodes NOT INDEXED` (without it SQLite picks a history index and a chunk costs about 20 times more) plus the JS `accept` predicate.
- Stops when `limit` rows are found (`next` = last row, `truncated` false), after `cap` candidates (`truncated` true), or when candidates run out (no `next`). Every page also says how many candidates it looked at (`examined`) and where to resume after each row (`cursors[i]`), so a caller can spend one budget over several calls and keep only part of a page (`tests/contract/spend/`). `cursor` is a rowid; `scanBounds` refuses one above 2^53 - 1 (and bad `limit` or `cap`) with BAD_INPUT before any SQL, for both dialects.
