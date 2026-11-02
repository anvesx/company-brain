# live

`recheck.ts` `stillReadable`: the per-query permission check. The graph says who may read (from the last sync); an optional `Recheck` asks the source at query time, as the research requires (Vectorize: permissions enforced at retrieval, per user and per query).

- A document is returned only when the graph edge exists and the check passes.
- A check that returns false or throws hides the document (fail closed). Never a 500.
- No check configured: graph-only behaviour, unchanged.
- `source-recheck.ts` `sourceRecheck`: a `Recheck` that calls the document connector's `canRead` with the asker's own token (`tokenFor`). Missing token, connector or `canRead` denies. GitHub implements `canRead` as a repo-level read with that token.
- Open: `brain serve` does not yet pass a `recheck`, because it holds no per-user source tokens.
