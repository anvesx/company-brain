# src

- `index.ts` public exports
- `sync.ts` `syncConnector`: paging, abort, error mapping, tombstone pass
- `document.ts` run context, node writer that skips unchanged content, one document and its `belongs-to` edge
- `access.ts` ACL to principal nodes and `can-read` edges, diffed against the graph
- `types.ts` `SyncDeps`, `SyncReport`, `SyncError` and its codes
