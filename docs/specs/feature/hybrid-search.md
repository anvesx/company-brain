# Spec: hybrid-search

Ticket: #34   Tier: feature   Milestone: M0   Design cards: idx.search
## Purpose
Keyword + vector search over derived chunks, fused with Reciprocal Rank Fusion. The ACL filter
arrives as an opaque SQL fragment, so this package never imports `acl-filter`.
## Reuse decision
`better-sqlite3@13.0.3` with built-in FTS5, plus `sqlite-vec@0.1.9` for vectors. RRF is ours
(about 25 lines); Orama was rejected because it weights scores instead of fusing ranks.
## Public interface
```ts
export type Hit = { chunkId: string; docId: string; score: number };
export type AclFragment = { sql: string; params: unknown[] }; // a WHERE clause over table `chunks`
export interface SearchIndex {
  add(c: { chunkId: string; docId: string; tenantId: string; text: string; embedding: number[]; acl: Acl }): void;
  search(q: { text: string; embedding: number[]; limit: number; acl: AclFragment }): Hit[];
  remove(docId: string): number; // chunks removed
}
export function createSearchIndex(dbPath: string, dim: number): SearchIndex;
export function rrf(lists: string[][], k?: number): { id: string; score: number }[]; // k default 60
```
## Behaviour
1. `rrf`: score = sum of 1/(k+rank), rank starting at 1. Ties break by id ascending. Empty lists allowed.
2. The ACL fragment is applied inside both the FTS query and the vector query, before ranking. A chunk the fragment excludes never appears, even at rank 1.
3. Embedding length not equal to `dim` throws `SearchError("DIM")`. Empty query text uses vector only; zero results returns `[]`.
4. `limit` 1..100. FTS input is escaped so quotes, `*` and `NEAR` cannot inject operators.
5. `remove` deletes from both indexes in one transaction.
## Acceptance tests (first)
unit (rrf worked examples, tie order, escape), integration (3 docs, one forbidden by fragment, assert it never returns), mutation >= 80, scale (100k chunks, query under 150 ms, record in README).
## Layout
`features/hybrid-search/src/{rrf.ts,fts.ts,vec.ts,index-db.ts,escape.ts,errors.ts}`.
## Out of scope
Embedding generation, reranking, hydration.
