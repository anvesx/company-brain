# Core 2: petabyte-scale retrieval research

Date: 2026-10-24. Scope: how petabyte-class retrieval is built, and what it means for the Devx Brain core (embeddings + BM25 pointer index, ACL pre-filter, RRF, cross-encoder rerank, small side graph).

Flag rules. `verified=true` means I read the page body. `verified=false` means I saw only a search snippet or summary. Vendor numbers are the vendor's own, not independent tests. Where I found no source, I say so and do not fill the gap.

## 1. Index size math

### Sourced numbers

| Item | Number (paraphrased) | Source | verified |
|---|---|---|---|
| 250M embeddings, 1024 dims, float32 | 953.67 GB | https://huggingface.co/blog/embedding-quantization | true |
| Same, int8 | 238.41 GB (4x smaller) | same | true |
| Same, binary | 29.80 GB (32x smaller) | same | true |
| Quality after quantising (MTEB retrieval NDCG@10, one model) | int8 keeps 97%, binary keeps 92.5%; binary with rescoring keeps 96.5% | same | true |
| Speed of exact CPU search | int8 about 3.7x faster on average, binary about 25x | same | true |
| Matryoshka truncation | text-embedding-3-large cut to 256 dims still beat ada-002 at 1536 dims on MTEB (62.0 vs 61.0). Only works on models trained for it; slices must be renormalised | https://supabase.com/blog/matryoshka-embeddings (blog summaries, not OpenAI docs) | false |
| ColBERT v1 index, MS MARCO v1 | 154 GiB; ColBERTv2 shrinks it to 16 GiB (1 bit) or 25 GiB (2 bits) | https://arxiv.org/pdf/2112.01488 | false |
| ColBERTv2 index, MS MARCO v2 (9B tokens, about 140M passages) | about 200 GB at 1 bit, which is about 21 bytes per token | https://cs224v.stanford.edu/lectures/ColBERT-Stanford-224V-talk-Nov2023.pdf (slides; the per-token figure is the search summary's arithmetic) | false |
| Turbopuffer 100B-vector index | 1024 dims, f16, about 200 TiB raw vectors; 1-bit RaBitQ codes cut data vectors 16 to 32x; under 1% of candidates reranked at full precision | https://turbopuffer.com/blog/ann-v3 | true |
| Elastic BBQ (binary quantisation, built on RaBitQ ideas) | about 95% memory reduction; vendor says 2 to 5x faster queries than PQ at no extra accuracy loss | https://www.elastic.co/search-labs/blog/better-binary-quantization-lucene-elasticsearch | false |

Product quantisation (PQ): no bytes-per-vector source was read. PQ size is a design choice (number of sub-codes times bits per code), so the worked block below states it as an assumption.

### Takeaways
- Binary or 1-bit codes with a full-precision rescore are the standard way to get 32x smaller vectors while keeping most of the quality (evidence: HF, turbopuffer).
- Multi-vector (ColBERT) costs per token, not per chunk. A 512-token chunk becomes about 512 small vectors. It is the most expensive option by far.
- Cost per GB of RAM: HF's table implies about $3.80 per GB per month (3,623 dollars / 953.67 GB; our arithmetic from their figure). No SSD or object-storage price was sourced, so none is used here.

## 2. Disk and object-storage-native ANN

| System | What it does | Published numbers | Source | verified |
|---|---|---|---|---|
| DiskANN (Microsoft, 2019) | Graph index on SSD, compressed vectors in RAM | 1B points (SIFT1B) on one 64 GB RAM machine with SSD; over 5,000 QPS, mean latency under 3 ms, 95%+ 1-recall@1 on 16 cores; 5 to 10x more points per node than in-memory graphs | https://www.microsoft.com/en-us/research/publication/diskann/ | false |
| SPANN (Microsoft, 2021) | Centroids in RAM, posting lists on SSD | Same 90% recall as DiskANN about 2x faster at same memory; about 90% recall in about 1 ms with 32 GB (authors' benchmarks) | https://arxiv.org/pdf/2111.08566 | false |
| SPFresh (Microsoft, 2023) | In-place updates for a SPANN-style index | Authors say about 1% of DRAM and under 10% of cores at peak versus a rebuild approach, at 1% daily updates. An independent paper reports SPFresh reaching only about 0.75 recall 10@10 after initial build | https://arxiv.org/abs/2410.14452 ; independent: https://arxiv.org/html/2505.17152v1 | false |
| Turbopuffer | Data on object storage, cached on NVMe and RAM, SPFresh-style centroid index | Cold query on 1M docs: p50 874 ms; warm: p50 14 ms. A cold query needs 3 to 4 object-store round trips of about 100 ms each. Up to 256 shards per namespace. ANN v3: up to 100B vectors, 200 ms p99, over 1,000 QPS in production (saturated by compute). Writes: about 10,000+ vectors per second, one log entry per namespace per second | https://turbopuffer.com/docs/architecture ; https://turbopuffer.com/blog/ann-v3 | true |
| Pinecone serverless | Immutable slabs on object storage, per-slab algorithm, disk cache on executors | Vendor claims 20 to 100 ms latency on 100M to 1B vectors. Small recent data scanned exactly | https://www.pinecone.io/how-pinecone-works/ | false |
| Vespa | HNSW plus disk-backed inverted file, vectors mostly on disk, stateless compute layer | Vendor claims latency under 100 ms at billions of items. No audited billion-scale benchmark found | https://blog.vespa.ai/vespa-hybrid-billion-scale-vector-search/ | false |
| LanceDB | Lance files on object storage | Vendor says 20 PB largest table. Small test: 0.91 recall@10, p95 about 6 ms on 1.18M vectors. No billion-scale p95 on object storage found | https://docs.lancedb.com/storage/index.md | false |
| Milvus 2.6 | Tiered storage: object store, local SSD cache, memory | Needs 2.6.4 or later. Vendor claims of 50 to 87% storage savings are unverified | https://milvus.io/docs/best-practices-for-tiered-storage.md | false |

Takeaways
- The only public 100B-class latency figure is turbopuffer's, and it is a vendor figure. It runs on 1-bit codes, a tree of centroids with about 100 children per node, and heavy NVMe caching (evidence: ANN v3 post).
- Cold object-storage reads cost round trips, not bandwidth. Plan for 400 ms or more on the first hit of any cold shard (evidence: turbopuffer docs).
- Centroid indexes need fewer round trips and update more cheaply than graphs, per turbopuffer (their claim, no measurement given). SPFresh recall may be lower than graphs (independent paper, snippet only).

## 3. Tiering

What the sources show:
- Hot, warm, cold is already how Zilliz/Milvus (RAM, SSD, object store) and turbopuffer (RAM, NVMe, S3) work (sources above).
- Dropbox's older search engine, Nautilus, built full indexes offline about every 3 days and applied changes as live mutations within seconds. Source: https://dropbox.tech/machine-learning/architecture-of-nautilus-the-new-dropbox-search-engine (verified=false, snippet).
- Microsoft splits connectors into synced (content stored in Graph with an ACL per item) and federated (queried live, nothing stored). Source: https://learn.microsoft.com/graph/connecting-external-content-connectors-overview (verified=false).

What I did not find: a public source on choosing per source what to embed (metadata only, summary only, sampled), or on embedding by recency or access frequency. The proposals below are our inference.

Proposed tiers (our inference)
- Hot: last 90 days or recently opened items. BM25 plus int8 or binary vectors in RAM or NVMe.
- Warm: older but touched in the last year. BM25 plus binary vectors on NVMe.
- Cold: everything else. Pointer, title, owner, ACL, and a short summary only. No vector. Found by BM25 on metadata, then fetched live.
- Per source: a policy table with one of `full`, `summary`, `metadata`, `sampled`. Sources with huge low-value volume (logs, chat firehose, build output) default to `metadata` or `sampled`.
- Promotion: embed on first access or on a rising query hit count; demote on a decay timer.

## 4. Cheap-first cascades

Sourced:
- A SPLADE++ inverted index measured 2.3 GB against 2.6 GB for BM25, so learned sparse costs about the same disk as BM25. It is slower than BM25, and slower than HNSW search in that study. Source: https://arxiv.org/pdf/2311.18503 (verified=false).
- Two-Step SPLADE reports up to 40x speedup over plain SPLADE with little quality loss. Source: https://www.themoonlight.io/en/review/two-step-splade-simple-efficient-and-effective-approximation-of-splade (secondary review, verified=false).
- Dropbox Dash says it relies mainly on index-based retrieval with BM25 over federated search. Source: https://dropbox.tech/machine-learning/vp-josh-clemm-knowledge-graphs-mcp-and-dspy-dash (verified=false).
- Warm versus cold gap: 14 ms versus 874 ms at p50 on turbopuffer, so a cache is worth a 60x difference (verified=true, source above).
- Cross-encoder cost per candidate: I found no source. It must be benchmarked on our hardware. The budget below is a placeholder.

Cascade shape (our inference): ACL resolve, then BM25 and ANN in parallel over only the allowed set, then RRF, then rerank the top 50 only, then live fetch of the top 10 with the source's own permission check. Early exit: if BM25 top hit score is far above the second and the query is an exact-match type (ID, title, name), skip ANN and rerank. Cache: query-result cache keyed by (query hash, user ACL signature), plus a hot-shard cache.

## 5. Filtered search with ACLs at billion scale

Sourced:
- GateANN (2026): on an SSD graph index it checks each node's filter in memory before any disk read, and routes through non-matching nodes without I/O. Reports up to 10x fewer SSD reads and up to 7.6x throughput. Source: https://arxiv.org/abs/2603.21466 (verified=true, abstract page).
- ACORN (2024): predicate-agnostic filtered search on HNSW, claims 2 to 1,000x higher throughput at fixed recall versus earlier methods. Source: https://arxiv.org/abs/2403.04871 (verified=true, abstract page).
- Filtered-DiskANN (WWW 2023): builds label-aware graphs. Source: https://dcreager.net/papers/Gollapudi2023/ (verified=false; no numbers read).
- Other 2025 to 2026 filtered-ANN papers seen only as titles: PathFinder https://arxiv.org/pdf/2511.00995 ; a benchmark https://arxiv.org/html/2507.21989v3 ; a survey arXiv:2505.06501 (no URL fetched). verified=false.
- I found no paper focused on access-control lists specifically at billion scale. ACLs get treated as one more filter predicate.
- The post-filter recall collapse is a known problem in these papers' framing, but I did not read a number for it. Treat the size of the collapse as unmeasured.

Design options (our inference)
- Pre-filter by exact bitmap (roaring bitmaps) when the user's allowed set is small; post-filter when it is large; switch on measured selectivity.
- Partition indexes by owning group or source so a query touches only the partitions the user can see; keep a per-user list of partition IDs from the ACL resolver.
- Per-document ACL stored as a group-ID list, with group membership resolved at query time, so a membership change needs no re-index.

## 6. Ingestion throughput

Sourced:
- OpenAI text-embedding-3-small lists at 0.02 dollars per 1M tokens. Whether batch is cheaper is unclear. Source: https://developers.openai.com/api/docs/models/text-embedding-3-small (verified=false).
- Turbopuffer writes about 10,000+ vectors per second per namespace and caps at one log entry per second per namespace (verified=true). Large backfills need many namespaces or shards.
- Incremental updates: SPFresh authors claim in-place updates at 1% daily change use about 1% of the DRAM of a rebuild approach (verified=false).
- No source found for GPU embedding throughput or GPU versus API break-even. Measure it.

Our inference: hash each chunk (content hash plus model ID) and skip re-embedding when the hash is unchanged. Store the model ID with every vector so a model upgrade is a rolling re-embed, hot tier first.

## 7. What Glean, Dropbox, Google and Microsoft say publicly

- Glean: a job post says the search index team serves queries over O(100M) documents with permissions and personalisation. Source: https://jobs.generalcatalyst.com/companies/glean/jobs/39339913-software-engineer-search-index (verified=false). I found no first-party engineering post on scale. Comparison sites call Glean an indexed (not federated) platform (verified=false).
- Dropbox Dash: BM25 index plus embeddings plus a knowledge graph; content is normalised to markdown, titles, metadata and links extracted, embeddings made (https://dropbox.tech/machine-learning/vp-josh-clemm-knowledge-graphs-mcp-and-dspy-dash, verified=false). Job posts mention trillions of documents as a goal (https://jobs.accel.com/companies/dropbox/jobs/46779141-staff-infrastructure-software-engineer-search-platform, verified=false; recruiting text, not a measurement).
- Microsoft: synced connectors store items with ACLs in Graph; federated connectors fetch live and store nothing (learn.microsoft.com URL above, verified=false). A 50M-items-per-tenant figure appears only on a mirror page (https://app-pack.telkomuniversity.ac.id/?p=488664), so treat it as unconfirmed (verified=false).
- Google: no scale numbers found for Vertex AI Search. Cloud Search caps indexed content at the first 10 MB per document (https://developers.google.com/workspace/cloud-search/docs/reference/limits, verified=false).
- None of the four publishes billion-document or petabyte figures with latency. Public evidence for that range comes from vector-database vendors, not enterprise search vendors.

## Worked arithmetic for 1 PB of text (our arithmetic)

Assumptions (ours, not sourced): 1 PB = 1e15 bytes of extracted text; 4 bytes per token; chunk = 500 tokens = 2,000 bytes; 1024-dim vectors; no chunk overlap; one vector per chunk unless stated; index overhead (graph links, centroids, metadata) not counted.

Counts
- Tokens: 1e15 / 4 = 2.5e14 tokens.
- Chunks: 1e15 / 2,000 = 5.0e11, which is 500 billion chunks.

Vector bytes per chunk and total

| Option | Bytes per chunk | Total | Fits in |
|---|---|---|---|
| float32, 1024 dims | 4,096 | 2.05 PB | object storage only |
| int8, 1024 dims | 1,024 | 512 TB | SSD tier |
| binary, 1024 dims (128 B) | 128 | 64 TB | RAM or NVMe across a cluster |
| PQ, 64 sub-codes at 8 bits (assumed) | 64 | 32 TB | RAM or NVMe |
| Matryoshka 256 dims, int8 | 256 | 128 TB | SSD tier |
| Matryoshka 256 dims, binary | 32 | 16 TB | RAM |
| ColBERT, 21 B per token (from Stanford slide) | about 10,500 (500 x 21) | about 5.25 PB | object storage only |

- The three options asked for: float32 2.05 PB, int8 512 TB, binary 64 TB. PQ at 32 TB is a fourth.
- Binary index in RAM: 64 TB / 512 GB per node = 125 nodes (assumed node size). Using HF's implied 3.80 dollars per GB-month: 65,536 GB x 3.80 = about 249,000 dollars per month. That is RAM only and an order-of-magnitude estimate.
- Full float32 for rescoring would sit on object storage or SSD (2.05 PB). Only candidate vectors are fetched.
- Embedding cost at list price: 2.5e14 tokens / 1e6 = 2.5e8 million tokens x 0.02 dollars = about 5.0 million dollars for embedding everything once. At 10% of the corpus embedded under the tiering policy: about 500,000 dollars.
- Chunk count tells us embedding all of it is the wrong default: 500 billion vectors versus a turbopuffer-proven 100 billion.
- Embed 20% of chunks (hot and warm): 1e11 chunks, binary 12.8 TB, int8 102 TB. This matches the size class turbopuffer reports serving.

p95 budget split, target 400 ms end to end (our allocation, not measured; the rerank figure is a placeholder because no source was found)

| Stage | Budget (ms) |
|---|---|
| ACL resolve (groups to partitions or bitmap) | 10 |
| BM25 and ANN in parallel, count the slower one | 80 |
| RRF merge | 5 |
| Cross-encoder rerank, top 50 | 150 |
| Live fetch and source permission check, top 10 | 120 |
| Slack | 35 |
| Total | 400 |

Cold-shard note: turbopuffer's cold query is about 400 to 874 ms alone, so a cold hit breaks this budget. Keep hot-tier shards warm and route cold queries to the metadata-only path.

## What this changes in our core

1. Do not embed everything. 1 PB is about 5e11 chunks and about 5 million dollars of embedding at list price; embed by policy per source (our inference).
2. Store vectors as 1-bit codes with a full-precision rescore of the top candidates. This gives 32x smaller vectors and kept about 96% of quality in one benchmark (evidence: HF; turbopuffer ANN v3).
3. Skip ColBERT-style multi-vector at this scale. About 5 PB for 1 PB of text by our arithmetic from a slide figure (our inference).
4. Use a centroid (cluster) index on SSD and object storage instead of an all-RAM graph. It needs few round trips and updates in place (evidence: turbopuffer; SPFresh paper, authors' claim).
5. Add a cold tier with pointers, metadata and summary only, found by BM25 and fetched live. This fits the pointer-index design (our inference).
6. Keep BM25 as the first stage and let it skip ANN on exact-match queries. Dropbox Dash leans on BM25 and learned sparse costs about the same disk (evidence: Dropbox blog and Lucene SPLADE paper, both unverified snippets).
7. Make ACL filtering selectivity-aware: bitmap pre-filter for narrow sets, partition by group, post-filter for broad sets. Recent papers show large gains over naive filtering, but none targets ACLs at billion scale (evidence: ACORN, GateANN; the design is our inference).
8. Plan for 400 ms or more on a cold shard and keep a hot-shard cache, since cold reads cost 3 to 4 object-store round trips (evidence: turbopuffer docs).
9. Key every vector by chunk hash plus model ID so a re-embed is incremental and a model upgrade rolls from hot to cold (our inference).
10. Measure before committing: cross-encoder cost per candidate, GPU versus API embedding cost, and recall of 1-bit codes on our own text. I found no sourced numbers for these (our inference).
