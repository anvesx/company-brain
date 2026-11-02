# src

- `index.ts` public exports
- `sync.ts` `syncConnector`: paging, abort, error mapping, tombstone pass
- `lease.ts` newest-run claim per (tenant, connector); an older run gets `SUPERSEDED`
- `types.ts` `SyncDeps`, `SyncReport`, `SyncError` and its codes, `SyncSkip`
- `write/` run context, node writer that skips unchanged content, one document and its `belongs-to` edge, ACL to principal nodes and `can-read` edges, per-entry skip with fail-closed revoke
- `membership/` optional group membership to `member-of` edges
