# @anvesx/index-service

## 0.2.0

### Minor Changes

- 422ef04: hybrid-search: add atomic `replace(docId, tenantId, chunks)`. index-service: verify fetched text against `pointer.contentHash` (`HASH_MISMATCH`) and swap chunks with `replace`, so a failed update keeps the old chunks and the prior pointer. `CLEANUP_FAILED` is removed.
- Add offset paging to hybrid-search, live ACL check and paging metadata to query-service, optional fetchText and prefetched content in index-service, and a connector-based live verifier in retrieval. Breaking: re-index required, upsert events carry optional content, sync search throws LIVE_ACL when a verifier is configured.
- 037efe8: Initial release of @anvesx/index-service.

### Patch Changes

- Updated dependencies [ac64dcb]
- Updated dependencies [422ef04]
- Updated dependencies
- Updated dependencies [f7a6d5a]
- Updated dependencies [f7a6d5a]
- Updated dependencies [f7a6d5a]
  - @anvesx/pointer-registry@0.2.0
  - @anvesx/hybrid-search@0.2.0
  - @anvesx/chunker@0.2.0
