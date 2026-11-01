# @brain/hybrid-search

Local keyword + vector retrieval for derived chunks. FTS5 ranks literal keyword
queries with BM25; `sqlite-vec@0.1.9` ranks embeddings by L2 distance (same order as cosine for normalized embeddings); RRF
combines the two rank lists. The package generates no embeddings and returns no
document body.

## Interface

`createSearchIndex(dbPath, dim)` returns synchronous `add`, `search`, and
`remove` operations. `search` accepts an opaque parameterized SQL predicate over
`chunks`. The predicate executes inside both retrieval statements, so excluded
chunks cannot enter either list. `rrf(lists, k = 60)` is also public.

```ts
import { createSearchIndex } from "@brain/hybrid-search";

const index = createSearchIndex("./brain.sqlite", 3);
index.add({
  chunkId: "c1", docId: "d1", tenantId: "acme", text: "incident runbook",
  embedding: [0.1, 0.2, 0.3],
  acl: { allowUsers: ["u1"], allowGroups: [], version: 1 },
});
const hits = index.search({
  text: "incident", embedding: [0.1, 0.2, 0.3], limit: 10,
  acl: { sql: "tenant_id = ?", params: ["acme"] },
});
```

## Guarantees and limits

- Embeddings must match the fixed dimension; limits are integers from 1 to 100.
- FTS quotes, `*`, and `NEAR` are quoted as literals, never query operators.
- Removal updates chunks, FTS5, and sqlite-vec in one `BEGIN IMMEDIATE` transaction.
- One instance is synchronous. Separate writers wait up to 5 seconds via SQLite.
- ACL SQL is trusted compiler output; values belong in `params`, not the SQL string.
- vec0 caps knn at 4096; selective ACLs fall back to an exact scan of allowed rows.
- sqlite-vec is pre-1.0 and brute-force; this adapter is not the 1M-chunk backend.

## Scale evidence

Apple arm64, Node 26.0.0, in-memory SQLite, 100,000 two-dimensional chunks,
November 2, 2026: five warm query runs were `4.50, 3.51, 3.48, 3.44, 3.51 ms`
(min 3.44, max 4.50 ms). Loading the fixture took 17.8 seconds. This measures
query latency, not ingestion throughput or larger production dimensions.

## Verify

Run `pnpm test`, `pnpm typecheck`, and `pnpm mutation` from this directory.
The scale assertion is `<150 ms`; mutation must be at least 80%.
