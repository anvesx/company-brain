# Build plan for company-brain pointer search

**Filter by access control list (ACL) inside the candidate query, then rank.** Phase 1 is SQLite FTS5 BM25 with column weights plus recency and closeness. No machine learning until an offline test set shows a gain.

## Reference architecture

```
connector change feed -> normalize -> index (FTS5 + metadata + links)
query + user token -> ACL check (live) -> candidates (BM25F) -> signals -> pointers
                                   phase 2: + vector candidates, RRF
                                   phase 3: + LambdaMART from agent-open logs
```

## Libraries (Open Source Initiative (OSI) licenses; re-verify at adoption)

| Library | License | Gives | Fit for Node and TypeScript | ACL filter |
|---|---|---|---|---|
| [SQLite FTS5](https://www.sqlite.org/fts5.html) | Public domain | BM25, column weights via `bm25()` | Native via `node:sqlite` | Join on ACL table in the same query |
| [sqlite-vec](https://github.com/asg017/sqlite-vec) | MIT / Apache-2.0 | Vector search in SQLite | Loadable extension | Filter by joining rowids |
| [Apache Lucene](https://lucene.apache.org/) | Apache-2.0 | Full BM25F, rerank hooks | JVM only; run as a service | Query filters |
| [Tantivy](https://github.com/quickwit-oss/tantivy) | MIT license | Rust BM25 engine | Needs bindings | Query filters |
| [MiniSearch](https://github.com/lucaong/minisearch) | MIT | In-memory BM25-style search | Pure TS | Filter callback |
| [LightGBM](https://github.com/microsoft/LightGBM) | MIT | LambdaRank objective | Python train, export model | Not applicable |
| [Transformers.js](https://github.com/huggingface/transformers.js) | Apache-2.0 | Local embeddings | Pure JS runtime | Not applicable |

Meilisearch core is MIT but its EE parts (LICENSE-EE, commercial) are not OSI: do not adopt. Typesense is GPL-3.0 (OSI, copyleft). pgvector uses the PostgreSQL License (OSI). Qdrant filter-during-search behavior and XGBoost rank objective support: not verified.

## Permission filtering: before or after ranking

| Approach | Leak risk | Cost |
|---|---|---|
| **Pre-filter** (ACL in candidate query) | Lowest. Scores and counts only reflect visible docs. | Slightly slower queries |
| **Post-filter** (rank, then drop) | Score and count leaks. Top-k can shrink to zero, a recall loss seen in pgvector filtering. | Fast, simple |
| **Index-time ACL only** | Stale after permission changes | Cheap, wrong on revoke |

Elastic [document-level security](https://www.elastic.co/docs/deploy-manage/users-roles/cluster-or-deployment-auth/controlling-access-at-document-field-level) filters at query time. [Google Cloud Search](https://developers.google.com/workspace/cloud-search/docs/guides/acls) stores access control lists (ACLs) with each item. [Microsoft Graph connectors](https://learn.microsoft.com/en-us/graph/api/resources/externalconnectors-externalitem) ingest ACLs with items. Glean's live-versus-snapshot behavior is third-party and **unconfirmed**.

## Ranked signals for pointers

1. **BM25F match** on title (weight high), path, summary.
2. **Recency** of modified time.
3. **Closeness** of file to the user's recent work.
4. **Link graph** prior from folder and mention edges.
5. **Owner and source** priors, learned in phase 3.

## Phases

1. **Phase 1, no ML.** FTS5 plus signals above. Weights set by hand against the test set.
2. **Phase 2, hybrid.** Add embeddings. Fuse with RRF. Ship only if nDCG@10 rises.
3. **Phase 3, LTR.** Train LambdaMART on agent-open feedback. See [Joachims](https://www.cs.cornell.edu/people/tj/publications/joachims_02c.pdf) on click bias.

## Evaluation

- **Set:** 100 to 200 real queries with judged files, drawn from agent logs.
- **Metrics:** nDCG@10 and MRR, per phase against the phase before.
- **Gate:** no phase ships without a gain on the set.

## Do not copy from Google

- Web crawling, robots.txt and a URL frontier.
- Web-scale PageRank and spam systems.
- Click memorization without volume.
- Shared index with post-hoc ACL filtering.

## Open questions

1. How many agent queries per week exist to build the test set?
2. Is the ACL check cheap enough to run inside every candidate query?
3. Which connector gives reliable revoke events?
4. Should embeddings run locally or through an API?

## Sources

- [SQLite FTS5](https://www.sqlite.org/fts5.html)
- [Elastic document-level security](https://www.elastic.co/docs/deploy-manage/users-roles/cluster-or-deployment-auth/controlling-access-at-document-field-level)
- [Google Cloud Search ACLs](https://developers.google.com/workspace/cloud-search/docs/guides/acls)
- [Microsoft Graph connectors](https://learn.microsoft.com/en-us/graph/api/resources/externalconnectors-externalitem)
- [Joachims, optimizing search engines using clickthrough data](https://www.cs.cornell.edu/people/tj/publications/joachims_02c.pdf)
- [ADR 0004](../../adr/0004-rag-and-brain-are-separate.md)
- Library repo pages linked in the table
