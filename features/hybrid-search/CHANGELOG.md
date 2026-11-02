# @anvesx/hybrid-search

## 0.2.0

### Minor Changes

- 422ef04: hybrid-search: add atomic `replace(docId, tenantId, chunks)`. index-service: verify fetched text against `pointer.contentHash` (`HASH_MISMATCH`) and swap chunks with `replace`, so a failed update keeps the old chunks and the prior pointer. `CLEANUP_FAILED` is removed.
- Add offset paging to hybrid-search, live ACL check and paging metadata to query-service, optional fetchText and prefetched content in index-service, and a connector-based live verifier in retrieval. Breaking: re-index required, upsert events carry optional content, sync search throws LIVE_ACL when a verifier is configured.
- f7a6d5a: Review-driven fixes: tenant-scoped APIs, stronger ids, anchors; see issue tracker. Re-index required for chunker/hybrid-search.
