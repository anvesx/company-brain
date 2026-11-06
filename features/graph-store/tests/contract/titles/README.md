# contract/titles

- `search.test.ts`: `searchTitles` on every dialect: literal `%` `_` `\`, ASCII case folding, kind filter, keyset paging, asOf, tenants.
- `search.rules.test.ts`: `reachedBy`, code-unit id order, BAD_INPUT, CLOSED.
- `scan.test.ts`: `scanTitles` on every dialect: pages equal the search oracle, insertion order, `cap` and `truncated`, the one-kind edge rule, BAD_INPUT.
