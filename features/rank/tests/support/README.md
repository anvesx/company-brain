# support

Shared helpers. None of them import from `src` internals; they use the public `RankIndex` only.

- `docs.ts`: `doc()` builder with defaults, `open()` for an in-memory index with a fixed clock, `PRINCIPALS`, and fast-check arbitraries for docs, askers and queries.
- `oracle.ts`: a brute-force reference ranker. It filters docs by principal first, computes N, df and average lengths over the permitted docs only, and scores with plain loops. It exports `NOW`, the fixed clock.
- `errors.ts`: `codeOf(fn)` returns the `RankError` code a call throws, and `bad(x)` casts a deliberately wrong value for tests of input checks.
- `tmpfile.ts`: `useTmpFile()` registers hooks that create and delete a temp SQLite path, and returns an `open` bound to it.
