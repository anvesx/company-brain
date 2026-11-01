---

"@brain/hybrid-search": minor
"@brain/index-service": minor
---

hybrid-search: add atomic `replace(docId, tenantId, chunks)`. index-service: verify fetched text against `pointer.contentHash` (`HASH_MISMATCH`) and swap chunks with `replace`, so a failed update keeps the old chunks and the prior pointer. `CLEANUP_FAILED` is removed.
