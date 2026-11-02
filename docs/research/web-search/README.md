# Web search research for company-brain

**Do not copy Google's crawl stack. Copy its discipline.** 

Company-brain reads connector change feeds over a small, permission-bound corpus. BM25 stays a strong baseline: on [BEIR](https://arxiv.org/abs/2104.08663) (a zero-shot retrieval benchmark) it beats dense passage retrieval (DPR) by 47.7% and trails most dense models by about 3%. 

Phase 1 is SQLite FTS5 BM25 with column weights plus recency, link and closeness signals. Phase 2 adds embeddings fused by reciprocal rank fusion (RRF). Phase 3 trains LambdaMART from agent-open feedback. Apply the access control list (ACL) filter inside the candidate query, before ranking. Every phase must raise normalized discounted cumulative gain at 10 (nDCG@10) on an offline set first.

## Index

| File | Answers |
|---|---|
| [crawl-and-index.md](crawl-and-index.md) | How Google crawls and stores pages; what transfers |
| [ranking.md](ranking.md) | PageRank to Navboost; known versus unconfirmed |
| [alternatives-to-bm25.md](alternatives-to-bm25.md) | Benchmarks, cost and when each method wins |
| [build-plan.md](build-plan.md) | Architecture, libraries, ACL, phases, evaluation |

## Labels used

- **Documented:** primary source (paper, Google docs, court record).
- **Inferred:** reasoned from documented parts.
- **Unconfirmed:** leak, blog or SEO site.
- **Not verified:** source could not be loaded.

## Next action

Build the offline relevance set (100 to 200 judged queries) before writing phase 1 code.

## Limits

Research only. No code changed. Several primary sources failed to load; those claims say "not verified".

## Sources

- [BEIR](https://arxiv.org/abs/2104.08663)
- Per-file Sources lists in each linked file
