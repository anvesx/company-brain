# Alternatives to BM25, with numbers

**BM25 is still a strong baseline.** In the Benchmarking IR (BEIR) [paper](https://arxiv.org/abs/2104.08663), BM25 beats dense passage retrieval (DPR) by 47.7% on average zero-shot. It sits within about 3% of most dense models. Only reranking and late interaction clearly beat it.

## Evidence

| Method | Result | Baseline | Source |
|---|---|---|---|
| BM25 + cross-encoder rerank | +11% average nDCG@10 | BM25 alone, 18 BEIR datasets | [BEIR](https://arxiv.org/abs/2104.08663) |
| ColBERT (late interaction) | +2.5% average | BM25, BEIR | BEIR |
| DPR (dense) | 47.7% below BM25 average | BM25, BEIR | BEIR |
| BM25 on Microsoft MARCO dev | mean reciprocal rank (MRR) MRR@10 0.184 default, 0.187 tuned | Pyserini defaults | [Pyserini](https://castorini.github.io/pyserini/2cr/msmarco-v1-passage.html) |
| BM25 untuned Lucene | MRR@10 16.7 | Microsoft MARCO passage | [Nogueira and Cho](https://arxiv.org/abs/1901.04085) |
| ColBERTv2 | Reported gains on BEIR and out-of-domain sets | Dense and sparse baselines | [ColBERTv2](https://arxiv.org/abs/2112.01488) |

Microsoft MARCO rewards trained models, because they train on it. BEIR tests zero-shot transfer, which matches a new company corpus better.

## When each wins

| Method | Wins when | Cost, latency, ops |
|---|---|---|
| **BM25 / BM25F** | Exact names, ids, file names, rare terms | No GPU. Milliseconds. One SQLite file. |
| **Learned sparse (SPLADE)** | Vocabulary mismatch, but you want an inverted index. [Paper](https://arxiv.org/abs/2107.05720) | Needs a model at index and query time. Larger index. |
| **Dense (DPR style)** | Paraphrase queries with training data. [DPR](https://arxiv.org/abs/2004.04906) | Embedding per doc and per query. Vector store. Weak zero-shot per BEIR. |
| **Late interaction (ColBERT)** | Quality matters and index size is acceptable | Many vectors per doc. Heavier storage and ops. |
| **Hybrid with reciprocal rank fusion (RRF)** | Mixed query types; no score calibration wanted. [RRF paper](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf) | Two retrievers. Fusion by rank only, so no tuning of score scales. |
| **Cross-encoder or LLM rerank** | Top 20 to 50 candidates need best order | One model call per candidate. Adds hundreds of ms. Not verified per model. |
| **LambdaMART (LTR)** | You have click or label data. [Overview](https://www.microsoft.com/en-us/research/publication/from-ranknet-to-lambdarank-to-lambdamart-an-overview/) | Cheap at query time. Needs feature logs and labels. |

## Embedding benchmarks

The Massive Text Embedding Benchmark ([MTEB](https://arxiv.org/abs/2210.07316)) compares embedding models across 8 task types. No single model won all tasks. Pick a model by retrieval score and size, then test on your own corpus. Specific model scores change often; not verified here.

## What fits company-brain

1. **Start with BM25F.** Titles and paths carry most intent. Weight them.
2. **Add dense later for paraphrases.** Fuse with RRF so no score tuning is needed.
3. **Rerank only the top 30.** Run it only if the offline set shows a gain.
4. **Train LTR last.** It needs labels first.

## Limits

- The BEIR averages above are the paper's, from 2021. Newer dense models score higher. Not verified here.
- Joachims-style click LTR is not in this table. See [build-plan.md](build-plan.md).

## Sources

- [BEIR](https://arxiv.org/abs/2104.08663)
- [Pyserini Microsoft MARCO passage regressions](https://castorini.github.io/pyserini/2cr/msmarco-v1-passage.html)
- [Passage re-ranking with BERT](https://arxiv.org/abs/1901.04085)
- [ColBERTv2](https://arxiv.org/abs/2112.01488)
- [SPLADE](https://arxiv.org/abs/2107.05720)
- [Dense Passage Retrieval](https://arxiv.org/abs/2004.04906)
- [Reciprocal rank fusion (Cormack et al.)](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf)
- [MTEB](https://arxiv.org/abs/2210.07316)
- [From RankNet to LambdaMART](https://www.microsoft.com/en-us/research/publication/from-ranknet-to-lambdarank-to-lambdamart-an-overview/)
