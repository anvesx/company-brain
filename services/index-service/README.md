# @brain/index-service

Applies change events to the search index. Spec: `docs/specs/service/index-service.md`.

```ts
import { createIndexService } from "@brain/index-service";

const svc = createIndexService({ registry, index, chunk, embed, fetchText }); // fetchText is optional
await svc.apply({ type: "upsert", pointer }); // { outcome: "created" | "updated" | "unchanged", chunks }
await svc.apply({ type: "upsert", pointer, content: { text, contentHash } }); // text already fetched: no fetchText call
await svc.apply({ type: "delete", tenantId, id, at }); // { outcome: "deleted" | "absent", chunks: 0 }
```

`registry` is `@brain/pointer-registry`, `index` is `@brain/hybrid-search`, `chunk(docId, text)` is
`chunkText` from `@brain/chunker` (or a wrapper with options). `embed(texts)` and `fetchText(pointer)`
are injected, so the service does no network I/O of its own. `fetchText` is optional: without it, every
upsert that needs indexing must carry `content`, else `INVALID_EVENT` (the registry row is restored, so a replay
with content succeeds). `unchanged` upserts and deletes never need it.

## Behaviour

- Upsert: the registry decides. `unchanged` does nothing (no fetch, no embed). `created` or `updated`
  fetches text, chunks, embeds, then replaces the document's chunks (`remove(id, tenantId)`, then `add`).
  An ACL change makes the pointer `updated`, so chunk ACL columns are rewritten with the new ACL.
- Pre-fetched text: an upsert may carry `content: { text, contentHash }`. Then `fetchText` is not called. Before
  anything changes, `contentHash` must equal `pointer.contentHash` and `text` must hash to it (sha-256 hex of the
  UTF-8 text), else `HASH_MISMATCH` and the registry and index are untouched. A non-string `text` or `contentHash`
  is `INVALID_EVENT`. Without `content` the service fetches as before. `unchanged` ignores `content`.
- Delete: chunks are removed first, then the pointer is tombstoned. Deleting an unknown or already
  deleted doc returns `absent` and still removes any stray chunks, so replay is safe.
- Everything is keyed by `(tenantId, id)`. The same `id` in two tenants never mixes.
- Events for one `(tenantId, id)` run one at a time in arrival order; others run in parallel. The lock has no
  timeout (a hung task blocks its own key only) and releases its key map entry when idle (`pending()` is 0).
- Replaying any event stream converges to the same state.

## Failure model

The pointer is written before the slow work, so every failure before the chunk swap restores the
previous registry row (or tombstones a brand new one). Old chunks are never touched.

Permission revocation survives failure: the restored row carries the intersection of the old and incoming
ACL, written to the registry and to the index ACL copy (`index.updateAcl`). A failed fetch can narrow
access to stale chunks but never widen it, and the replay still sees the doc as changed. Fetch, chunk and
embed failures, wrong vector count, ragged or non-finite vectors, and a vector dimension the index
rejects (probed with a read-only search) all end this way. Replaying the same event then retries.

Limit: if `index.remove` succeeds and a later `index.add` throws (disk full, for example), the old
chunks cannot be recovered because the index has no read-back. The service removes partial chunks and
tombstones the pointer, so the registry and index agree that the doc is not indexed, and a replay
rebuilds it. `hybrid-search` has no transaction spanning remove and add.

If that cleanup removal also fails, the error is `CLEANUP_FAILED` and `cause` is an `AggregateError` of
`[addError, cleanupError]`.

Errors are `IndexServiceError` with `code`: `INVALID_EVENT`, `HASH_MISMATCH`, `FETCH_FAILED`, `CHUNK_FAILED`,
`EMBED_FAILED`, `EMBED_INVALID`, `INDEX_FAILED`, `CLEANUP_FAILED`, `ROLLBACK_FAILED`. The original error is in `cause`.

## Limits

- Serialisation is in-process. Two processes writing the same database file can interleave.
- The registry stores pointers only; the index keeps tokens and ACLs only (no body text), so text is re-fetched from the source unless the caller passes it as `content`.

## Test

`pnpm test`, `pnpm typecheck`, `pnpm mutation` from this folder.
