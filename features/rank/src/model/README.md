# model

The vocabulary of the package and the gate that input passes through.

- `types.ts`: `Doc` (id, title, path, body, principals, mtimeMs, links), `SearchRequest` (query, `asker.principals`, optional `k`), `Hit` (id, path, score, `signals`), `Signals` (text, recency, links), `Cols` (title, path, body weights or counts), `Probe`, `OpenOptions` (`now`, `weights`).
- `errors.ts`: `RankError` with a `code` of `BAD_DOC`, `BAD_ASKER`, `BAD_QUERY` or `CLOSED`.
- `validate.ts`: `validateDoc` and `validateRequest`.

## Validation rules

- Ids, paths, principals and link targets must be non-empty, well-formed UTF-16 (no lone surrogates), contain no NUL, and fit the length limit (1024 for ids, paths and links, 256 for principals). Titles and bodies may be empty but must be well-formed. `mtimeMs` must be finite.
- An index batch is validated in full before anything is written, so one bad doc writes nothing.
- The asker must carry 1 to 256 principals. Anything else, including a missing asker, an empty list, a non-array or a non-string entry, throws `BAD_ASKER`. This runs before the database is touched, which is what makes the search fail closed.
- `k` defaults to 10 and must be an integer from 1 to 100, otherwise `BAD_QUERY`. A non-string query is also `BAD_QUERY`. An empty or all-punctuation string is a valid query that matches nothing.
