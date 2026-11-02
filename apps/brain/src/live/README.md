# live

`recheck.ts` `stillReadable`: the per-query permission check. The graph says who may read (from the last sync); an optional `Recheck` asks the source at query time, as the research requires (Vectorize: permissions enforced at retrieval, per user and per query).

- A document is returned only when the graph edge exists and the check passes.
- A check that returns false or throws hides the document (fail closed). Never a 500.
- No check configured: graph-only behaviour, unchanged.
- Open: no source-backed `Recheck` ships yet. It needs a per-user source token that the bearer token does not carry.
