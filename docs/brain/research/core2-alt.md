# Devx Brain core: alternative designs compared

Date: 2026-10-24. Scope: designs other than our current inference (embeddings + BM25 pointer index, ACL pre-filter, RRF, rerank, small property graph).

Reading rule: "verified=true" means I opened the page and read the number. "verified=false" means the number came from a search snippet or a third-party summary only. Lines tagged (our inference) are not from the sources.

Honest headline: no source tests the exact Devx Brain setup (federated, per-user permissions, many SaaS apps, 10k employees). Every number below comes from a narrower test. The evidence says the designs are complements, not rivals.

---

## A. Agentic search over live source APIs, no central vector copy

### A1. "Is Grep All You Need? How Agent Harnesses Reshape Agentic Search" (May 2026)
- Sources opened: https://arxiv.org/abs/2605.15184 and https://arxiv.org/html/2605.15184
- Authors: Sen, Kasturi, Lumer, Gulati, Subbiah.
- How it works: an LLM agent calls a grep tool or a vector tool over the same long-chat memory (116 questions from LongMemEval). Tested in a custom harness and in Claude Code, Codex CLI and Gemini CLI.
- Authors' numbers: with results returned inline, grep beat vector in all 10 model and harness pairs (for example 93.1 vs 83.6 for Opus 4.6 in their harness; 86.2 vs 62.9 for Gemini Flash-Lite). With results written to files, vector won 5 of 10 pairs. GPT-5.4 in Codex fell from 93.1 to 55.2 with file-based grep. With a full distractor haystack the order flipped often (for example Gemini CLI: 78.5 grep vs 89.7 vector).
- Where it wins: small, well-keyworded corpora; strong models; inline tool results.
- Where it loses: depends on harness as much as on retriever; weak models; file-based result delivery.
- Cost: paper reports no token, cost or latency numbers.
- Caveats (authors and my read): one benchmark, chat memory, not enterprise data; the authors say they do not claim grep beats vector in general; some table values disagree between tables; grader is GPT-4o.
- verified=true.

### A2. "Keyword search is all you need" (submitted Dec 2025)
- Source opened: https://arxiv.org/abs/2602.23368 and https://arxiv.org/html/2602.23368v1
- Authors: Subramanian, Akinfaderin, Zhang, Singh, Khanuja, Singh, Tanke (AWS-affiliated names; affiliation not confirmed on the page).
- How it works: a Claude 3 Sonnet ReAct agent with shell tools (pdfgrep, rga) vs a Bedrock Knowledge Base RAG baseline on 6 small document sets (PDFs).
- Authors' numbers: agent reached about 91% of RAG answer correctness on average, 88% of context recall. On FinanceBench the agent scored higher (about 33% vs 24%), with run-to-run spread.
- Where it wins: small to medium static document sets, simple setup, no standing index.
- Where it loses: large documents, ambiguous queries, context limits. No long-term memory. The authors flag access control as future work.
- Cost: no figures given.
- Caveats: LLM-judge scores, few runs, old model, tiny corpora.
- verified=true.

### A3. Fixed-corpus agent benchmark: BrowseComp-Plus
- Source opened: https://arxiv.org/abs/2508.06600
- Authors: Chen, Ma, Zhuang, ... Jimmy Lin (20 authors).
- How it works: fixed human-checked corpus so retriever and agent can be varied separately.
- Authors' numbers: Search-R1 with BM25 scored 3.86%. GPT-5 scored 55.9%. GPT-5 with Qwen3-Embedding-8B scored 70.1% with fewer search calls. The page does not say which retriever gave the 55.9%, so this is not a clean head-to-head.
- Meaning: a strong agent still gains from a good retriever. Agentic search does not remove the retriever question. The corpus is web pages, not SaaS data.
- verified=true for the three numbers; corpus size not read on the page I opened.

### A4. Vendor view: Glean, "Is MCP + federated search killing the index?"
- Source opened: https://www.glean.com/blog/federated-indexed-enterprise-ai (last updated June 12, 2025)
- Argument: federated live search has no cross-source ranking, waits for the slowest source, gives partial results, and misses signals such as popularity. Glean argues for a permission-aware central index plus a knowledge graph.
- Numbers: none. This is a vendor with a stake in indexing.
- Fair counterpoint from the same page: federated search returns only what the current user can access through the source API, which is easy to permission.
- verified=true (page read), evidence level = opinion.

Summary for A: Where it matches an index: small corpora, exact-term questions, strong model, inline results. Where it loses: broad semantic questions, many apps with slow or rate-limited search APIs, ranking across sources. Cost shifts from storage to tokens and API calls per query. Permission fit is the best of all designs because the source enforces it.

---

## B. LLM-compiled knowledge (wiki, summary tree, community summaries, memory as files)

### B1. Karpathy "LLM Wiki" idea file (April 2026)
- Source opened: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
- How it works: raw sources stay unchanged. An LLM writes and maintains markdown pages (summaries, entity pages, an index, a log). On ingest one source can touch 10 to 15 pages. A periodic lint pass looks for contradictions, stale claims, orphans. Queries read the index, then the pages.
- Numbers: none. The gist says a catalog index works at roughly 100 sources and a few hundred pages, then suggests adding a search tool.
- Where it wins: a single person or small team, a slow-changing topic, answers that should compound.
- Where it loses: it has no permission model; no check for wrong LLM-written pages beyond lint and human review; the gist does not say where it breaks at scale. One page per source cluster mixes access levels, which is a leak risk for Devx Brain (our inference).
- Cost: LLM calls on every ingest; 10 to 15 page rewrites per source (author's description).
- verified=true (gist read; first 100,000 of 116,694 characters).

### B2. RAPTOR (2024, ICLR)
- Source opened: https://arxiv.org/abs/2401.18059
- Authors: Sarthi, Abdullah, Tuli, Khanna, Goldie, Manning.
- How it works: embed chunks, cluster, summarize, repeat, giving a tree. Retrieve from all levels.
- Authors' numbers: with GPT-4, +20 points absolute on QuALITY (long single documents).
- Where it wins: questions about a whole long document.
- Where it loses: built for single long documents, not multi-tenant SaaS; summaries hide per-user permissions; every change means re-clustering part of the tree (our inference).
- verified=true.

### B3. GraphRAG community summaries (2024)
- Source opened: https://arxiv.org/abs/2404.16130
- Authors: Edge, Trinh, Cheng, Bradley, Chao, Mody, Truitt, Metropolitansky, Ness, Larson.
- How it works: an LLM extracts an entity graph, then pre-writes summaries for communities of entities. At query time each summary yields a partial answer and the parts are merged.
- Authors' numbers: on global "sensemaking" questions over datasets near 1 million tokens, answers are more comprehensive and diverse than plain RAG.
- Where it wins: "what are the main themes" questions.
- Where it loses: index cost is high (see D); global questions are rare in daily enterprise lookup (our inference).
- verified=true (abstract).

### B4. When graphs and summaries help: GraphRAG-Bench
- Sources opened: https://arxiv.org/abs/2506.05690 and https://arxiv.org/html/2506.05690v3 (Xiang, Wu, Zhang, Chen, Hong, Huang, Su).
- Authors' numbers (GPT-4o-mini, novel corpus): fact retrieval, vanilla RAG with rerank 60.92 vs best graph method 60.14 (no gain). Complex reasoning 42.93 vs 53.38 (HippoRAG2). Contextual summarization 51.30 vs 64.40 (MS-GraphRAG). Average prompt tokens: vanilla RAG 879, HippoRAG2 1,008, RAPTOR 3,441, LightRAG 100,832, MS-GraphRAG global 331,375.
- Authors say recent studies find GraphRAG often underperforms vanilla RAG on real tasks.
- Companion: RAG vs GraphRAG, https://arxiv.org/abs/2502.11371 (Han et al.). Finding: each is better on different tasks; routing or combining gives consistent gains. No numbers read on the page. verified=true for the abstract only.
- verified=true.

Summary for B: Compiled layers help on summary and multi-hop reasoning questions and do nothing for plain lookups. They are weak on permissions and freshness. Use B only as a derived, per-permission-scope cache, not as the core (our inference).

---

## C. Hybrid: small entity graph + cheap lexical index + learned sparse or late interaction + live fetch

### C1. Anthropic Contextual Retrieval (2024)
- Source opened: https://www.anthropic.com/news/contextual-retrieval
- How it works: an LLM writes a short context line for each chunk before embedding and BM25 indexing; then rerank.
- Numbers (Anthropic internal tests): top-20 failure rate 5.7% baseline, 3.7% with contextual embeddings, 2.9% with contextual BM25 added, 1.9% with reranking (a 67% relative cut). One-time cost about $1.02 per million document tokens with prompt caching.
- Note from the same post: knowledge bases under 200k tokens can skip RAG and go in the prompt.
- Where it wins: cheap, big gain, matches our current core shape. Where it loses: needs a reindex when a chunk changes; internal benchmark, not enterprise ACL data.
- verified=true.

### C2. PLAID reproducibility: BM25 first, late-interaction rerank
- Source opened: https://arxiv.org/abs/2404.14989 (MacAvaney and Tonellotto, SIGIR 2024).
- Finding: ColBERTv2 reranking over a BM25 candidate pool gives better efficiency and quality trade-offs than PLAID in low-latency settings. It cannot reach peak quality at higher latency because lexical recall limits it; adding neighbor expansion removes that ceiling.
- Numbers: none on the abstract page.
- Meaning: a cheap lexical stage plus a late-interaction reranker is a sound design. verified=true (abstract).

### C3. Jina-ColBERT-v2
- Source opened: https://arxiv.org/abs/2408.16672 (Jha, Wang, Günther, Mastrapas, Sturua, Mohr, Koukounas, Akram, Wang, Xiao).
- Claim: multilingual late-interaction model with lower storage. Page opened shows no numbers. Search snippets said output size can drop from 128 to 64 dims with small loss and up to 50% less storage, and +6.5% over ColBERTv2; I did not confirm these on the paper itself. verified=false for those numbers.

### C4. SPLADE and index-size numbers
- Source opened: https://arxiv.org/abs/2604.21511 (SAE-SPLADE; Zong, Vast, Van Cooten, Soulier, Piwowarski). The abstract page shows no size or latency figures.
- Search snippet only (verified=false): about 20 GiB for ColBERT-style storage vs 3 GiB for sparse on MS MARCO v1; under 10 ms with a BMP sparse index vs 58 ms with PLAID. Snippet also gave BEIR averages BM25 0.450, SPLADEv3 0.511 (from arxiv.org/pdf/2606.05568, not opened). Treat all as unconfirmed.

### C5. Temporal graph layer: Zep / Graphiti
- Source opened: https://arxiv.org/abs/2501.13956 (abstract). Authors page not read for names.
- Authors' numbers: DMR 94.8% vs MemGPT 93.4%; up to 18.5% accuracy gain and 90% lower response latency on LongMemEval vs baselines.
- Where it wins: facts that change over time; keeps old facts with validity times. Where it loses: this is chat and business memory, not multi-app ACLs; the abstract does not describe the incremental update method; vendor paper. verified=true for abstract only.

Summary for C: This is the best-supported family for retrieval quality per dollar. It is close to what we already have. The change worth making is to add contextual chunk text, a learned sparse or late-interaction reranker, and a temporal entity layer. The hybrid also needs live fetch for permissions and freshness, which no single paper tests together.

---

## D. Index-time vs query-time cost

### D1. LazyGraphRAG (Microsoft Research, Nov 2024; note dated June 2025)
- Source opened: https://www.microsoft.com/en-us/research/blog/lazygraphrag/
- How it works: indexing uses noun-phrase extraction and graph statistics, with no LLM summaries. At query time an LLM splits the query into 3 to 5 subqueries, chunks are ranked and tested for relevance with a budget, then claims are extracted and merged.
- Authors' numbers: indexing cost equals vector RAG and is about 0.1% of full GraphRAG. On global queries the same setup matched GraphRAG global search at over 700 times lower query cost. At 4% of GraphRAG global query cost it beat all compared methods on local and global queries. Tested on 5,590 AP news articles with 100 synthetic queries, LLM-judged.
- Caveats from the authors: lowest budget did not beat GraphRAG global; every query still costs LLM calls; one dataset. They expect a combined index and lazy search to do better.
- Where it fits: cheap indexing with variable query cost. Weak for us: it is a corpus-level design with no per-user permission step (our inference).
- verified=true.

### D2. LightRAG incremental updates
- Sources opened: https://arxiv.org/abs/2410.05779 (Guo, Xia, Yu, Ao, Huang).
- Claim: an incremental update path avoids a full rebuild; abstract gives no numbers and no method detail. Search snippets said the headline "610,000 tokens vs under 100" is the authors' own estimate for one query mode, and that the update advantage is weaker if modern GraphRAG already avoids regenerating old communities. verified=false for those snippet claims.
- GraphRAG-Bench (B4) measured LightRAG at about 100,832 prompt tokens per query, so the per-query savings claim does not hold in that independent run.

### D3. What breaks at 10k employees
No paper tests this scale on permissioned SaaS data. The points below are our inference and each is flagged as such:
- (our inference) Per-user ACLs: a central copy must store and refresh ACLs for every document. A source change in sharing can lag. A summary or graph node that merges documents with different ACLs leaks unless it is built per permission scope, which multiplies cost.
- (our inference) Rate limits: live fetch at 10k users multiplies calls on each vendor's API limits. Needs caching and per-app budgets.
- (our inference) Incremental graph and summary updates: every source edit may touch many derived pages; Karpathy's gist says 10 to 15 pages per source.
- Source-backed: Glean says federated search waits on the slowest source and gives partial results (A4). The GoSearch comparison (found via search, https://www.gosearch.ai/blog/?p=6342, not opened, verified=false) says live connectors use the user's own credentials and indexed copies lag until re-index.

---

## E. Benchmarks that could decide

| Benchmark | Source opened | What it tests | Fit for Devx Brain |
|---|---|---|---|
| Benchmarking Deep Search over Heterogeneous Enterprise Data | https://arxiv.org/abs/2506.23139 (Choubey, Peng, Bhagavath, Huang, Xiong, Wu; June 2025) | Multi-hop across docs, transcripts, Slack, GitHub, URLs; 39,190 artifacts; answerable and unanswerable questions. Best agentic RAG averaged 32.96. Authors name retrieval as the bottleneck. | Best match for cross-app multi-hop. No permissions, no freshness. |
| DRBench | https://arxiv.org/abs/2510.00172 (Abaskohi et al.; ICLR 2026) | 100 deep-research tasks, 10 domains, private enterprise sources plus web. | Cross-app. Page does not show permission or freshness tests. |
| Can LLMs Help You at Work? (EnterpriseBench) | https://arxiv.org/abs/2510.27287 (Fujitsu Research; EMNLP 2025); details from search result, abstract page not opened, verified=false | 500 tasks, fragmented sources, role-based access control. Best model 41.8% completion (snippet). | Only one found with access control built in. |
| BrowseComp-Plus | https://arxiv.org/abs/2508.06600 | Separates retriever from agent on a fixed corpus. | Good method for our A/B, wrong data. |
| GraphRAG-Bench | https://arxiv.org/abs/2506.05690 | Fact, reasoning, summary, creative tasks; token cost. | Decides whether the graph layer earns its cost. |
| LongMemEval (used in A1 and C5) | via A1 and C5 | Long chat memory, includes time-changing facts. | Freshness proxy only. |

Gap: I found no public benchmark that scores permission leakage and freshness together on multi-app data. The position paper https://arxiv.org/abs/2509.14608 (found via search, not opened, verified=false) argues for strict ACL enforcement but is not a benchmark. We must build a small in-house set (our inference).

---

## Petabyte scale re-score (new owner constraint: scale and query speed first)

Owner constraint: data can reach petabytes; scalability and query speed are the top priority. No paper I opened tests text retrieval at 10B to 100B chunks over permissioned SaaS data. What exists is billion-point vector search and per-chunk LLM cost data. The rest below is arithmetic on stated assumptions. Every derived figure is (our inference).

### Sizing assumptions (our inference, change them if you have real data)
- 1 TB of source text is about 250 billion tokens (assume 4 bytes per token).
- A chunk is 800 tokens (the size Anthropic used in its cost example). So 1 TB is about 312 million chunks.
- 10B chunks is about 32 TB of text. 100B chunks is about 320 TB. 1 PB is about 312B chunks.

### Evidence on query speed at billion scale (vector side only)
- DiskANN, https://papers.nips.cc/paper/2019/hash/09853c7fb1d3f8ee67a61b6bf4a7f8e6-Abstract.html (opened, verified=true): one workstation with 64 GB RAM and an SSD serves a billion points. On SIFT1B it did over 5,000 queries per second, mean latency under 3 ms, over 95% 1-recall@1, on 16 cores. It says DiskANN fits 5 to 10 times more points per node than HNSW or NSG.
- SPANN, https://arxiv.org/abs/2111.08566 (opened, verified=true): centroids in RAM, posting lists on SSD. About 90% recall in around 1 ms with 32 GB memory, and about 2x faster than DiskANN at the same recall and memory, on three billion-scale datasets (names not on the abstract page). Search results say it was deployed in Bing (alphaXiv overview; not opened, verified=false).
- Caveat (our inference): these are benchmark vectors of modest size and no ACL filter. Text embeddings are bigger (a 1024-dim fp32 vector is 4 KB, so about 1.25 TB of vectors per TB of source before compression). Filtering by user permission inside approximate search is a known hard case that I did not research; test it before trusting any ms figure.
- No source gives a p95 at 10B to 100B chunks. Our inference: shard to about 1B vectors per node (the proven single-node size above), so 100B chunks means about 100 vector shards plus the same for the lexical index. Query p95 is then set by the slowest shard in the fan-out, so budget hundreds of ms, not a few ms, until measured.

### Per-design scores at petabyte scale

| Design | Index size per TB source (our inference unless noted) | p95 latency at 10B to 100B chunks | Indexing LLM cost per TB | Update throughput | Sharding story | Verdict at 1 PB |
|---|---|---|---|---|---|---|
| A. Agentic live search | Zero copy. Size lives in each SaaS | Not an index latency. It is source API latency times agent turns, so seconds. No source measured it | Zero at index time. Cost moves to tokens per query | Instant (no copy) | Each SaaS is a shard. Limits are vendor rate limits | Survives, because nothing is copied. It cannot scan a petabyte itself. It only works if each source's own search works, and it is slow |
| B. LLM wiki, RAPTOR, GraphRAG summaries | Pages and summaries add on top of the raw text. GraphRAG-Bench shows 3,441 to 331,375 prompt tokens per query for tree and summary methods (verified=true) | Poor. Query prompts of 100k to 331k tokens (GraphRAG-Bench, verified=true) are far from interactive | Very high. See cost math below | Weak. Karpathy gist: one source can touch 10 to 15 pages | No known sharding. Summaries span documents, so they cross ACL and shard lines | Breaks. Unaffordable over every document |
| C. Hybrid (contextual chunks, BM25, dense, sparse or late interaction, small graph) | Dense: about 4 KB per chunk at 1024-dim fp32, so about 1.25 TB per TB. Compression (int8, binary, fewer dims) cuts this. Late interaction: a search snippet gave 20 GiB vs 3 GiB sparse on 8.8M MS MARCO passages (verified=false). Scaled to 312B chunks that is roughly 700 TB of late-interaction vectors per PB | Dense and lexical: per-shard ms proven at 1B (above). Late interaction as a reranker on top-k only is cheap (PLAID reproduction, verified=true) | Contextual text: $1.02 per million document tokens (Anthropic, verified=true) is about $255,000 per TB, about $255M per PB by our arithmetic. Embeddings and BM25 alone have no LLM cost | Good for lexical and dense. Append-only segments and delete markers are standard (our inference) | Standard: shard by tenant or hash, about 1B vectors per node | Survives only with tiers. Full contextualization and full late-interaction storage over a PB break |
| D. Lazy graph, query-time build | Same as vector RAG at index (Microsoft, verified=true), plus a noun-phrase concept graph | Each query runs many LLM relevance tests (budget of 100 to 1,500 tests in the paper). With a PB behind it, LLM cost per query and p95 grow. Not tested beyond 5,590 articles | Close to zero LLM cost. Microsoft says 0.1% of GraphRAG | Good (no summaries to refresh) | Graph is global. Sharding is not described | Index survives. Query side is a risk. Fine as a rare deep-dive mode, not the default path |
| Current core (embeddings + BM25 + ACL pre-filter + RRF + rerank) | Same as C without contextual text. Dense dominates | Same as C | Zero LLM cost at index | Good | Standard | Survives with tiers and vector compression |

### Cost math for the designs that call an LLM per chunk (our inference, from sourced rates)
- Contextual retrieval: $1.02 per million document tokens (Anthropic) times 250,000 million tokens per TB is about $255,000 per TB. At 1 PB that is about $255M. Doing it for even 1% of a petabyte (10 TB) is about $2.55M.
- Full GraphRAG: a search snippet from a Medium post (verified=false) says extraction uses about 10M LLM tokens per 1M corpus tokens, about $50 at GPT-4o input pricing, and other posts say 4 to 6 LLM calls per chunk. At $50 per million corpus tokens, 1 TB is about $12.5M and 1 PB about $12.5B. Even if the snippet is wrong by 10x, this is unaffordable. Microsoft's LazyGraphRAG post (verified=true) says full GraphRAG indexing costs about 1,000 times its own indexing, which supports the direction.
- Wiki and summary layers: no per-TB figure exists. The gist says one source touches 10 to 15 pages, so LLM work per source is at least that many page rewrites. Treat as the same order as GraphRAG, or worse (our inference).

### What breaks at a petabyte (plain statement)
- Break: B (LLM wiki or summaries over every document), full GraphRAG, LLM-contextualized chunks over everything, and full-corpus late-interaction vector storage. The cost math above is why. (our inference, built on sourced rates)
- Break on speed: agentic live search as the only path (seconds per query, vendor rate limits). (our inference; no benchmark measured it)
- Survive: lexical index, quantized dense vectors with sharding, pointer-only metadata, small entity graph built without an LLM, late interaction as a top-k reranker only. (evidence for the vector shard size and PLAID reranking; our inference for the rest)

---

## Comparison of 5 candidate cores

Ratings for quality, freshness, permission fit come from the evidence above where marked, else our inference. Cost, build weeks and the petabyte column are our inference only; no source gives them for this setting.

| Core | Multi-hop quality | Freshness | Permission fit | Cost at 10k employees | Build effort (weeks) | At petabyte scale |
|---|---|---|---|---|---|---|
| A. Agentic live search, no index | Medium; depends on model and harness (A1); retrieval was the bottleneck in 2506.23139 | Best (live) | Best (source enforces per user) | Token and API cost per query; rate limits bite | 3 to 5 | Survives (no copy) but slow, seconds per query, and cannot scan PB itself |
| B. LLM-compiled wiki or summary tree | Good on summary and reasoning (B4), flat on fact lookup | Weak (needs rebuild or lint) | Weak (derived pages mix ACLs) | Heavy LLM spend on ingest; per-scope copies multiply it | 6 to 10 | Breaks. About $12.5B per PB for full-GraphRAG-style extraction at the unverified rate |
| C. Hybrid: entity graph + lexical + learned sparse or late interaction + live fetch | Good (C1, C2, B4 evidence); best supported | Good (live fetch for hot data, short refresh for rest) | Good (ACL filter plus live check) | Moderate; one-time contextual-chunk cost plus index storage | 8 to 12 | Survives only tiered. Full contextual text is about $255M per PB; full late-interaction storage about 700 TB per PB |
| D. Lazy graph, query-time build | Good on global and local queries in one test | Good (no heavy prebuilt layer) | Medium (needs per-user scoping at query time) | Cheap index, per-query LLM cost grows with users | 5 to 8 | Index cheap; query LLM cost and latency are the risk. Use as a rare mode |
| Current core (reference) | Fact lookup strong; multi-hop only via small graph | Medium (index lag) | Good (ACL pre-filter) | Moderate | 6 to 8 | Survives with tiers and vector compression |

Note: the task listed A to E as designs, with E being benchmarks. The last row is the current core, for reference. Benchmarks (E) are the way to choose, not a core.

---

## Recommended core (tiered for petabyte scale)

Tier plan (our inference unless tagged):

- Tier 1, fully indexed (hot): content people query often and that changes slowly enough to index: recent and high-traffic documents, wikis, tickets, code docs. Lexical (BM25 or learned sparse) plus quantized dense vectors, ACL metadata, shards of about 1B vectors per node. Only this tier gets contextual chunk text and a late-interaction reranker, since contextualizing costs about $255,000 per TB. (evidence for the shard size, cost rate and reranker; our inference for the tier)
- Tier 2, lexical-only or sampled (warm): the bulk of the petabyte. Lexical index with no LLM and no per-chunk dense vectors; at most one vector per document (title plus summary) as a sample. Cost is storage only. (our inference)
- Tier 3, pointer-only (cold): store only source, title, owner, dates, links and an ACL fingerprint. Fetch and chunk live when a query points there. (our inference)
- Tier 4, live fetch (fast-changing or sensitive): chat, tickets in flight, permission-sensitive stores. Never copied. The agent calls the source's own search with the user's credentials, and this is also the final permission check for every result. (evidence that live fetch fits permissions: Glean post, A4; our inference for the rest)

Bullets:
- Core stays the hybrid index (current design), not a wiki or a full graph. At a petabyte, the LLM-per-chunk designs cost billions by our arithmetic. (our inference, built on sourced rates)
- Dense and lexical shards at about 1B vectors per node, quantized vectors, and a router that sends a query to the right shards and tiers. DiskANN and SPANN show 1 to 3 ms per shard at a billion points, but nobody measured 100B. (evidence for shard figures; our inference for the router)
- Put the late-interaction model only on the top-k as a reranker. The PLAID reproduction found BM25 plus a ColBERTv2 rerank wins at low latency, and storing token vectors for everything would be roughly 700 TB per PB. (evidence for rerank; our inference for the storage extrapolation)
- Build the entity graph from metadata and links (people, projects, documents, mentions) with no LLM. Use an LLM only on Tier 1 or on demand, in the lazy way: subquery split plus a relevance budget. (evidence for the lazy method, our inference for scope)
- Run the agent loop on top: it picks tiers, calls Tier 4 sources live, and may use grep-style tools on small sets. Deliver results inline. Grep matched or beat vector in inline loops on one benchmark and flipped with harness. (evidence)
- Never store summaries or wiki pages that span ACL scopes. If a derived page exists, build it per permission scope and re-check live. (our inference)
- Keep Tier assignment dynamic: promote a document to Tier 1 when queried often, demote when idle. (our inference)
- Before committing: build an in-house eval set with cross-app multi-hop questions (modelled on 2506.23139), permission traps, edit-freshness cases, plus a load test at 10B chunks with ACL filtering on. No public benchmark covers these. (our inference)
- Ask for real numbers to replace my assumptions: bytes of text per source, query rate, share of data touched in 90 days. Those three decide how big Tier 1 is. (our inference)
