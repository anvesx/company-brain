# src/runtime

| File        | Job                                                                                                         |
| ----------- | ----------------------------------------------------------------------------------------------------------- |
| `stores.ts` | `openStores`: registry, search index and cursor store, on disk under `dataDir` or in memory.                |
| `fetch.ts`  | `textFetcher`: `deps.fetchText`, or the tenant connector's `fetch` with the tenant credential when omitted. |
| `known.ts`  | `liveIds`: ids of a tenant's live pointers, paged with `afterId`; seeds `IngestionDeps.known`.              |
| `logger.ts` | `defaultLogger`: one JSON line per call on stderr.                                                          |
