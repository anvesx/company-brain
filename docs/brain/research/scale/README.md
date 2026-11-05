# Scale research: Meta and the papers behind it

**Meta's post "An Organizational Second Brain" (2 Sep 2026) is the same idea as ours.** Its GitHub link is Karpathy's LLM Wiki gist, which the post cites as the same pattern. Meta has published no facebookresearch repository for it. The researcher checked all 135 facebookresearch repositories created in 2026.

Our build measures speed. The papers measure correctness against a gold set. That is the main gap. Every spec in `docs/specs/feature/` sets a latency budget and none sets an accuracy target on real data.

Terms:

- Retrieval-augmented generation (RAG): a model answers from fetched text.
- Comprehensive RAG Benchmark (CRAG): a Meta question set.
- Factual Recency and Evolving Semantic Conflict (FRESCO): a Meta reranker benchmark.
- Latent Truth Model (LTM) and Knowledge-Based Trust (KBT): truth-discovery papers.
- Introduction file (README): where a repository's authors describe it.
- Knowledge Discovery and Data Mining (KDD): a conference.
- Proceedings of the VLDB Endowment (PVLDB): a journal.
- Facebook's graph store (TAO): a paper name that never expands.
- Superintelligent Retrieval Agent (SIRA), Retrieval Program Learning (RPL), Context Language Models (CLM): Meta methods.
- Approximate nearest neighbour (ANN) search: finding close vectors fast.
- Entity resolution (ER): deciding that two records name one thing.
- Pair recall (PC), pair precision (PQ), reduction ratio (RR): blocking scores.
- Access control list (ACL): who may read a document.

The PDFs live in `research/13-meta-and-scale` and `research/14-scale-algorithms` on the researcher's machine and are not in git. These files keep the findings. Paper cards sit in four group files:

| File | Holds |
| --- | --- |
| [meta.md](meta.md) | Meta posts, systems and benchmarks (9 cards) |
| [retrieval-and-memory.md](retrieval-and-memory.md) | Retrieval, agent memory, graph RAG, memory benchmarks (15 cards) |
| [truth-and-entities.md](truth-and-entities.md) | Truth discovery, streaming truth, entity resolution (10 cards) |
| [isolation-and-ingestion.md](isolation-and-ingestion.md) | Filtered search, ranking, tenant leakage, ingestion (10 cards) |

The source-trust cards for the Li survey, LTM and KBT also sit in [../trust/README.md](../trust/README.md). The Meta post is an exact source at [../exact/meta-organizational-second-brain.md](../exact/meta-organizational-second-brain.md).

## Which source is the same idea

The post says the industry "converged on a similar idea" and names Karpathy's LLM Wiki ([gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)). Its source is [Meta Engineering](https://engineering.fb.com/2026/09/02/ml-applications/organizational-second-brain-ai-learns-from-experts/).

| Rank | Candidate | Owner | Why |
| --- | --- | --- | --- |
| 1 | Organizational Second Brain post | Meta Engineering | Names the concept. Company knowledge as a file graph, routing indexes, RAG kept separate. |
| 2 | LLM Wiki gist | Karpathy, on GitHub | The GitHub item the Meta post links as the same pattern. Already an exact source here. |
| 3 | [Memo-Pro-Agent](https://github.com/facebookresearch/Memo-Pro-Agent) | facebookresearch, Oct 2026 | Graph of past events plus semantic memory. Personal, not company. No arXiv id yet. |
| 4 | Tribal-knowledge post | Meta Engineering, Apr 2026 | 50+ agents wrote 59 context files for data pipelines. Code scope only. |
| 5 | CRAG, FRESCO, SIRA, RPL, CLM, LogAct | Meta research | Parts of the stack. None is a company brain. |
| 6 | TAO, Unicorn, Faiss | Facebook infrastructure | The graph store, graph search and vector index Facebook runs at scale. |

## What Meta does at scale that we lack

Our target is 200 people and 5 GB a day per company. Meta's numbers come from the papers' abstracts.

| System | Their scale (as stated) | Mechanism we lack |
| --- | --- | --- |
| TAO (2013) | A billion reads per second on many petabytes | Graph-aware cache tiers in front of the store, read-after-write per cache |
| Unicorn (2013) | Tens of billions of nodes, trillions of edges, billions of queries a day, hundreds of ms | In-memory sharded graph index; social-proximity ranking; multi-hop set operators |
| Faiss (2024) | Six benchmark sets of 1 billion vectors each | Predicate filter inside the vector search (IDSelector) |
| Second Brain (2026) | 200+ knowledge files; about 80% fewer tokens per turn | Routing indexes, review loop, replay and regression tests |
| CRAG (2024) | 4,409 question-answer pairs; KDD Cup 2024 | A public benchmark with time-sensitive questions |

Two Facebook choices match ours. Unicorn keeps privacy out of the index and checks it when results are shown. TAO checks privacy each time content is viewed. Both back our live recheck with the asking user's token.

## Merged gap table

Status is have, partial or missing, against the specs in `docs/specs/feature/`.

| Their mechanism | Source | Our spec rule or feature | Status |
| --- | --- | --- | --- |
| Routing index maps input to files | Second Brain | query-router rules 2 to 5 pick graph or rag; no per-file index | missing |
| `depends_on` and `referenced_by` edges between knowledge files | Second Brain | graph-store `links-to` edge kind; no knowledge files | partial |
| Dense knowledge in a wiki, sparse in RAG | Second Brain | ADR 0004 (apps/brain graph, apps/rag text) | have |
| Linter for dangling refs, cycles, id collisions | Second Brain | graph-store rule 4 allows dangling edges on purpose | missing |
| Expert correction becomes a regression test | Second Brain | source-trust rule 9 re-scores on a correction; no regression suite | partial |
| Human review of every change as a pull request | Second Brain | zone-policy rule 2 needs consent to promote | partial |
| Privacy check at view time, outside the index | Unicorn, TAO | the brief: live recheck with the user's token; `apps/brain/src/live/recheck.ts` not called by `brain serve` | partial |
| Inverse association kept in sync with its edge | TAO | graph-store `neighbors` with `dir: "in"`; no paired write | partial |
| Cache tiers with read-after-write | TAO | graph-store is one SQLite file | missing |
| Multi-hop query across edges | Unicorn | graph-store rule 5, breadth-first, depth cap 6 | have |
| Social-proximity ranking | Unicorn | none | missing |
| Personalised PageRank over a memory graph | Memo-Pro-Agent; HippoRAG 2 ([2502.14802](https://arxiv.org/abs/2502.14802)) | graph-store rule 5 is breadth-first only | missing |
| Filter predicate inside the vector search | Faiss ([2401.08281](https://arxiv.org/abs/2401.08281)); Filtered-DiskANN; ACORN ([2403.04871](https://arxiv.org/abs/2403.04871)); SIEVE ([2507.11907](https://arxiv.org/abs/2507.11907)) | the brief: pre-filter inside ANN and BM25; no feature spec yet | missing |
| Rerankers prefer older, richer text over newer facts | FRESCO ([2604.14227](https://arxiv.org/abs/2604.14227)) | source-trust rules 5 and 6 (decay, newest wins a tie) | partial |
| Time-sensitive question set | CRAG ([2406.04744](https://arxiv.org/abs/2406.04744)) | change-cursor keeps data fresh; no benchmark | missing |
| Offline document enrichment with missing search words | SIRA ([2605.06647](https://arxiv.org/abs/2605.06647)) | the brief: contextual retrieval; no feature spec yet | missing |
| Model writes its own retrieval program | RPL ([2610.24854](https://arxiv.org/abs/2610.24854)) | query-router is fixed rules, no LLM in v1 | missing |
| Context kept as a file the model edits | CLM ([2609.37725](https://arxiv.org/abs/2609.37725)) | none | missing |
| Intended agent actions logged and voted on | LogAct ([2604.07988](https://arxiv.org/abs/2604.07988)) | none; the brain serves reads | missing |
| Four timestamps per edge, so "as known on date X" works | Zep ([2501.13956](https://arxiv.org/abs/2501.13956)) | graph-store rule 2: valid time only | partial |
| LLM picks add, update, delete or no-op per fact | Mem0 ([2504.19413](https://arxiv.org/abs/2504.19413)) | graph-sync diffs a full listing; no per-fact decision | partial |
| Incremental graph update by set union | LightRAG ([2410.05779](https://arxiv.org/abs/2410.05779)) | change-cursor rule 4 `diffListing`; run-level diff | partial |
| Community summaries for global questions | GraphRAG ([2404.16130](https://arxiv.org/abs/2404.16130)) | none; it rebuilds the whole graph | missing |
| Score on public memory benchmarks | LoCoMo ([2402.17753](https://arxiv.org/abs/2402.17753)); LongMemEval ([2410.10813](https://arxiv.org/abs/2410.10813)) | none run | missing |
| Per-source false positive and false negative rates | LTM ([1203.0058](https://arxiv.org/abs/1203.0058)) | source-trust rule 7: one accuracy per source | missing |
| Extractor error split from source error | KBT ([1502.03519](https://arxiv.org/abs/1502.03519)) | source-trust: claims taken as given | missing |
| Calibrated confidence | Knowledge Vault (KDD 2014) | source-trust: no calibration step | missing |
| Accuracy-weighted vote, iterate to stable | Li survey ([1505.02463](https://arxiv.org/abs/1505.02463)) | source-trust rules 2, 3, 7, 8 | have |
| Source accuracy carried between runs | Evolving truth (KDD 2015); streaming truth (CIKM 2014) | source-trust rule 8 starts from priors each run | missing |
| Blocking to avoid n squared pairs | Blocking survey ([1905.06167](https://arxiv.org/abs/1905.06167)) | entity-resolver rule 5 mentions an index; no blocking design | partial |
| Learned matcher, labelled pairs | Magellan (PVLDB 2016) | entity-resolver rules 1 to 3: hand rules | missing |
| Split a wrong merge later | Incremental linkage (PVLDB 2014) | entity-resolver rule 4: merges are final | missing |
| Field weights fitted by EM | Splink (IJPDS 2022) | entity-resolver rule 3: fixed thresholds | missing |
| Tenant-scoped query | RAG privacy ([2402.16893](https://arxiv.org/abs/2402.16893)) | graph-store rule 1; no extraction test | partial |
| Per-tenant cache keys | Timing ([2409.20002](https://arxiv.org/abs/2409.20002)); PromptPeek (NDSS 2025) | none measured | missing |
| Learned ranking on clicks | Airbnb ([1810.09591](https://arxiv.org/abs/1810.09591)); LiNR ([2407.13218](https://arxiv.org/abs/2407.13218)) | query-router is rule-based; no click data | missing |
| Incremental indexing, not rescans | Percolator (OSDI 2010) | graph-sync diffs a full listing each run | missing |
| Watermark backfill with pause and resume | DBLog ([2010.12597](https://arxiv.org/abs/2010.12597)) | change-cursor rule 3: delta cursor only | partial |
| Trainable key-value memory inside the model | Memory Layers ([2412.09764](https://arxiv.org/abs/2412.09764)) | not applicable; we keep pointers, not weights | missing |

## What is not calculated

Our build never measures these. The papers do.

**Do first:**

1. ER precision, recall and F1 on a labelled pair set; blocking PC, PQ and RR.
2. Truth discovery accuracy against gold labels on real claims, compared with majority voting.
3. Retrieval recall@k and accuracy on LongMemEval and LoCoMo, per ability.
4. ANN recall@10 under ACL filters, by filter specificity.
5. Freshness: seconds from a source change to a readable graph row.

**Later:**

1. Calibration error of trust scores.
2. Per-source false positive and false negative rates.
3. Cross-tenant leak rate: verbatim extraction and cache timing.
4. As-of query correctness once transaction time exists.
5. NDCG on logged clicks, once there is usage.

## Open measurements

`docs/progress.md` holds no list of open metric items, so the five do-first items live here. None has a result yet.

| Measurement | Owning spec | Result |
| --- | --- | --- |
| ER precision, recall, F1; blocking PC, PQ, RR | entity-resolver | not run |
| Truth accuracy against gold labels, versus voting | source-trust | not run |
| Recall@k and accuracy on LongMemEval and LoCoMo | none yet | not run |
| ANN recall@10 by ACL filter specificity | none yet (the brief) | not run |
| Freshness in seconds, change to readable row | change-cursor | not run |

## What could not be found

1. No facebookresearch, facebookincubator or meta-llama repository implements the second brain. GitHub search of the `facebook` org failed, so that org is unchecked.
2. No Meta paper on arXiv describes a company brain built from each employee's apps. Searches for Metamate found news only.
3. Memo-Pro-Agent has no arXiv id. Its README says identifiers come later.
4. The second-brain post gives no latency, cost or tenant numbers. Its scale claims are file counts and token savings.
5. Dragon, Sphinx, MemoryBank and MemWalker were not checked to the end.
6. Mem++ ([2610.02002](https://arxiv.org/abs/2610.02002)) fits organizational memory, but its authors are not Meta. It is left out.
7. TAO and Unicorn are not on arXiv. They use venue ids.
8. JedAI and Zingg: no paper downloaded. Cited by code: [JedAI](https://github.com/scify/JedAIToolkit), [Zingg](https://github.com/zinggAI/zingg).
9. Qdrant and Weaviate filtered HNSW: vendor posts only ([Qdrant](https://qdrant.tech/articles/vector-search-filtering/), [Weaviate](https://weaviate.io/blog/speed-up-filtered-vector-search)).
10. LinkedIn Galene, Uber search, Google Drive indexing and LinkedIn Databus: no paper or no official PDF. The Uber blog returned 406 and Twitter Earlybird returned 403.

Searches ran on 2026-11-06. Numbers come from the downloaded PDFs; where a paper shows results only in figures, the card says so.
