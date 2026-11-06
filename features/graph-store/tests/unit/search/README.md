# unit/search

Contract for `GraphStore.searchTitles`, written before the code (brief `docs/briefs/brain-mcp.md`).

- `search.test.ts`: `%`, `_` and `\` are literal; ASCII case-insensitive match; kind filter; keyset
  paging by id; current version only; tombstones skipped; `asOf`; tenant isolation; BAD_INPUT bounds.

Builders do not edit this folder. A change here needs the lead's sign-off.
