# @brain/query-service

ACL-safe search over the hybrid index. Spec: `docs/specs/service/query-service.md`.

## Interface

```ts
createQueryService({ index, registry }): { search(req): Pointer[] }
// req = { query: string; principal: Principal; embedding: number[]; limit?: number }
class QueryError extends Error { code: "EMPTY_QUERY" | "LIMIT" | "PRINCIPAL" | "EMBEDDING" | "BACKEND" }
```

`index` is a `@brain/hybrid-search` index; `registry` is a `@brain/pointer-registry` registry. `search` is synchronous. Wrap it in a promise for `@brain/mcp-search-tool`.

## Behaviour

1. The query is trimmed; blank or non-string is `EMPTY_QUERY`. `limit` is an integer 1 to 100, default 10, else `LIMIT`. A principal that fails `PrincipalSchema` is `PRINCIPAL`.
2. The index runs with `allowClause(principal)`, so tenant and ACL filter inside both retrieval lists. It always fetches 100 chunks so hidden hits cannot shrink the page.
3. Each hit's document is looked up in the registry under the principal's tenant. Missing, tombstoned, cross-tenant pointers are dropped.
4. The pointer's current ACL is re-checked with `isAllowed`. The index copy of the ACL can be stale: a revocation in the registry hides the document even before re-indexing.
5. Results keep rank order, one pointer per document, at most `limit`. Fewer results than `limit` is normal.
6. A wrong-dimension embedding is `EMBEDDING`. Any other index or registry failure is `BACKEND` with the original error as `cause`.

## Limits

- Zones are not an access rule here; visibility comes from the ACL only.
- Embeddings are supplied by the caller. No embedding model runs here.
- Up to 100 registry lookups per call.

## Test

`pnpm test`, `pnpm typecheck`, `pnpm mutation` from this folder. Tests use in-memory databases only. Build the features first: `pnpm --filter @brain/core-types build`, then acl-filter, hybrid-search, pointer-registry.
