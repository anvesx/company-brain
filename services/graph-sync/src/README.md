# src

- `index.ts` public exports
- `sync.ts` `syncConnector`: paging, abort, error mapping, tombstone pass
- `types.ts` `SyncDeps`, `SyncReport`, `SyncError` and its codes
- `write/` run context, node writer that skips unchanged content, one document and its `belongs-to` edge, ACL to principal nodes and `can-read` edges
- `membership/` optional group membership to `member-of` edges
