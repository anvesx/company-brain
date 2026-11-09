# unit/hardening

Tests added after the first verifier round on `searchTitles` and `scanTitles`.

- `control.test.ts`: a control character (NUL, tab, newline, DEL) in the search text is BAD_INPUT, not a SQL error or a match-all.
- `plan.test.ts`: `EXPLAIN QUERY PLAN` of the search SQL: FTS index plus the `edges_in` index, no full scan of `nodes` or `nodes_history`.
- `scan.test.ts`: `scanTitles` pages to exactly the rows of the LIKE oracle, stops at `cap`, gates one kind by edge, validates input.
