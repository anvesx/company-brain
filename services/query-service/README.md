# @brain/query-service

ACL-safe search over the hybrid index. Spec: `docs/specs/service/query-service.md`.

## Interface

```ts
// returns LiveQueryService (extends QueryService, so existing stubs of QueryService keep compiling)
createQueryService({ index, registry, liveAcl?, liveAclTimeoutMs?, timer?, maxCandidates? }): {
  search(req): Pointer[]                    // sync, cached ACL only
  searchLive(req): Promise<SearchResult>    // pages, optional live ACL, metadata
}
// SearchResult = { pointers, truncated, scanned, liveDenied, liveUnverified }
type LiveAcl = (tenantId, docIds, principal) => Promise<Map<docId, "allow" | "deny" | "unknown">>
// req = { query: string; principal: Principal; embedding: number[]; limit?: number }
class QueryError extends Error { code: "EMPTY_QUERY" | "LIMIT" | "PRINCIPAL" | "EMBEDDING" | "BACKEND" | "CONFIG" | "LIVE_ACL" }
```

`index` is a `@brain/hybrid-search` index; `registry` is a `@brain/pointer-registry` registry. `search` is synchronous and unchanged for callers without a live verifier; wrap it in a promise for `@brain/mcp-search-tool`. When `liveAcl` is configured, `search` throws `LIVE_ACL` (it would otherwise skip the live check, which fails open); use `searchLive`.

## Behaviour

1. The query is trimmed; blank or non-string is `EMPTY_QUERY`. `limit` is an integer 1 to 100, default 10, else `LIMIT`. A principal that fails `PrincipalSchema` is `PRINCIPAL`.
2. The index runs with `allowClause(principal)`, so tenant and ACL filter inside both retrieval lists. The service pages through it (`offset`, `limit` up to 100 per page) until `limit` visible hits are collected, the index is exhausted (short page, or a page with no new chunk), or `maxCandidates` (default 1000) hits were examined. Then `truncated` is `true`. It is conservative: an index with exactly `maxCandidates` hits also reports `true`.
3. Each hit's document is looked up in the registry under the principal's tenant. Missing, tombstoned, cross-tenant pointers are dropped.
4. The pointer's current ACL is re-checked with `isAllowed`. The index copy of the ACL can be stale: a revocation in the registry hides the document even before re-indexing.
5. `searchLive` then calls `liveAcl(tenantId, docIds, principal)` once per page, only for hits that passed step 4. Only `allow` keeps a hit. `deny` drops it (`liveDenied`). `unknown`, an id missing from the map, a non-Map result, a throw, or no answer within `liveAclTimeoutMs` (default 2000, via the injected `timer`) fail closed: dropped and counted in `liveUnverified`. No verifier means no live step. A failing page does not stop paging.
6. Results keep rank order, one pointer per document, at most `limit`. Fewer results than `limit` is normal only when `truncated` is false and the index is exhausted.
7. A wrong-dimension embedding is `EMBEDDING`. Any other index or registry failure, on any page, is `BACKEND` with the original error as `cause`. `maxCandidates` below 1 or non-integer is `CONFIG` at construction.

## Index API gap

`@brain/hybrid-search` `SearchQuery` has no `offset`, and `limit` is capped at 100. The service passes `offset` through the `PagedIndex` interface; today's index ignores it, returns the same top 100 again, and the service detects the repeat and stops, so behaviour equals one 100-hit window. Needed from hybrid-search: optional `offset` (integer >= 0) applied to the fused RRF ranking (fetch `offset + limit` from each of FTS and vec, so the per-list cap must exceed 100), with ACL applied before ranking as now.

## Limits

- Zones are not an access rule here; visibility comes from the ACL only.
- Embeddings are supplied by the caller. No embedding model runs here.
- Up to `maxCandidates` registry lookups per call, plus one live call per page.

## Test

`pnpm test`, `pnpm typecheck`, `pnpm mutation` from this folder. Tests use in-memory databases only. Build the features first: `pnpm --filter @brain/core-types build`, then acl-filter, hybrid-search, pointer-registry.
