# Core 2: graph-centred and stronger core designs (research notes)

Research date: 2026-10-24. "Verified yes" means I opened the page. "Verified no" means I saw it only in a search snippet or the fetch failed. Numbers are the authors' own unless stated. No independent replication was found for any vendor number.

## A. Graph and memory systems

### A1. Zep and Graphiti (temporal knowledge graph)
- URLs opened: https://arxiv.org/abs/2501.13956, https://arxiv.org/html/2501.13956v1, https://github.com/getzep/graphiti
- Date: paper submitted 2025-01-20.
- What it is: an agent memory service (Zep) built on an open-source temporal graph engine (Graphiti). Facts are stored with validity windows and older facts are marked invalid, not deleted.
- Data model: three subgraphs. Episode (raw input, lossless), semantic entity (entities and fact edges), community (clusters with summaries). Bi-temporal: each fact has a valid-time pair (true in the world) and an ingest/invalidate pair (when the system learned it). A contradicting fact closes the old fact's end time.
- Retrieval: cosine over embeddings, BM25, and breadth-first graph expansion in parallel, then rerank (RRF, MMR, graph distance, cross-encoder). This is close to our core plus a graph leg and time.
- Numbers (paper, LongMemEval, gpt-4o): full-context baseline 60.2% accuracy, 28.9 s latency, about 115k context tokens. Zep 71.2%, 2.58 s, about 1.6k tokens. Authors call this up to 18.5% accuracy gain and 90% lower latency. DMR: Zep 94.8% vs MemGPT 93.4%; the authors say margins are small and DMR is a weak test.
- Caveat: the baseline is "stuff the whole chat history in context", not a tuned vector+BM25 retriever. So this does not show a graph beats hybrid search. It shows retrieval beats full context.
- Cost: ingestion runs several LLM steps per episode (entity extraction with a reflection pass, entity resolution, fact extraction, fact resolution, temporal extraction, contradiction check). The paper gives no exact call count. Graphiti repo gives no cost figures. Its default ingest concurrency is 10 to avoid provider rate limits. Update is incremental, no batch recompute.
- Permissions: none built in. Graphiti partitions data by group_id; the reference servers have no authentication or authorization, and the repo says production users must add their own. Zep (commercial) adds users and governance.
- Verified: yes.

### A2. Microsoft LazyGraphRAG
- URL opened: https://www.microsoft.com/en-us/research/blog/lazygraphrag/
- Date: 2024-11-25, with a 2025-06-06 note that it is in Microsoft Discovery and Azure Local preview.
- What it is: a GraphRAG variant that defers LLM work to query time.
- Data model: concept co-occurrence graph from noun-phrase extraction (no LLM), plus a hierarchical community structure over it. Query time: LLM splits query into 3 to 5 subqueries, ranks chunks by embedding, tests relevance with an LLM in rank order, recurses into sub-communities, then answers from extracted claims.
- Numbers (Microsoft): indexing cost equals vector RAG and is about 0.1% of full GraphRAG. Global-query quality comparable to GraphRAG global search at more than 700 times lower query cost. At 4% of that query cost it beat all competitors on local and global queries. Test set: 5,590 AP news articles, 100 synthetic queries, LLM-judged.
- Caveats from the post: one corpus, synthetic queries, LLM judges. At the lowest budget (100 relevance tests) it did not significantly beat GraphRAG global search on global queries.
- Cost: cheap index, but query cost scales with the "relevance test budget" (LLM calls at query time).
- Permissions: not addressed.
- Verified: yes.

### A3. HippoRAG 2
- URLs opened: https://arxiv.org/abs/2502.14802, https://arxiv.org/html/2502.14802v1
- Date: submitted 2025-02-20, revised 2025-06-19, ICML 2025 per the arXiv comments.
- What it is: a graph memory that runs Personalized PageRank over a graph of phrase nodes and passage nodes, with LLM-assisted online steps. This is the same family as the "personalised PageRank on the side" idea in our core.
- Data model (MuSiQue example): 85,288 phrase nodes, 11,656 passage nodes, about 1.4M edges, of which about 1.13M are synonym edges.
- Numbers (paper Table 2, Llama-3.3-70B reader, average F1 across 7 datasets): HippoRAG 2 59.8, NV-Embed-v2 dense retriever 57.0, GraphRAG 49.6, RAPTOR 48.8, LightRAG 6.6. Abstract states a 7% gain on associative memory over the best embedding model. On simple factual sets the gap to the dense retriever is small (NQ 63.3 vs 61.9; PopQA 56.2 vs 55.7). Biggest gap is multi-hop (MuSiQue 48.6 vs 45.7, 2Wiki 71.0 vs 61.5).
- Reading: a graph with PPR gives about 3 points overall and about 9 points on 2Wiki over a strong dense retriever. It does not collapse factual recall, unlike GraphRAG and LightRAG in this table.
- Cost (Table 12, MuSiQue index): HippoRAG 2 about 9.2M input and 3.0M output tokens. GraphRAG about 115.5M input and 36.1M output (about 12x). LightRAG about 68.5M input and 18.3M output (about 7x). RAPTOR is cheaper (about 1.7M input).
- Permissions: none. Research system.
- Verified: yes.

### A4. LightRAG
- URL opened: https://arxiv.org/abs/2410.05779
- Date: submitted 2024-10-08, revised 2025-04-28.
- What it is: entity and relation graph with dual-level (low and high) retrieval, plus an incremental update algorithm.
- Numbers: the abstract claims "considerable improvements" with no figures. Independent numbers in A3 show it far below dense retrieval on that setup, and index cost about 7x HippoRAG 2. Treat its self-reported wins with care.
- Permissions: none stated.
- Verified: yes (abstract only).

### A5. RAG vs GraphRAG evaluation (Han et al.)
- URL opened: https://arxiv.org/abs/2502.11371
- Date: v1 2025-02-17, v3 2026-03-04.
- Finding: neither dominates; each wins on different tasks. Selecting between them or combining them gives consistent gains. GraphRAG has efficiency costs. Abstract gives no scores.
- A snippet-only secondary claim (GraphRAG-Bench, arXiv 2506.05690, not opened): graph retrieval about 4.5% better on HotpotQA multi-hop at about 2.3x latency. Verified: no for that claim.
- Verified: yes for Han et al. abstract.

### A6. Cognee
- URL seen only in search: https://www.cognee.ai/knowledge-graph-memory-benchmarks
- Vendor claim: 24 HotPotQA questions, 45 runs, human-like correctness 0.93, base RAG 0.4. Tiny sample, vendor-run. No cost data found.
- Verified: no. Neo4j GraphRAG and other graph stores were not researched beyond Graphiti's backend list (Neo4j 5.26, FalkorDB, Neptune).

## B. How real products build the core

### B1. Glean
- URLs opened: https://docs.glean.com/security/knowledge-graph, https://www.glean.com/perspectives/understanding-glean-and-claude-enterprise-hosting-architectures (updated 2026-07-03).
- Data model: knowledge graph on three pillars: content, people (identity, team, roles), activity (interactions, history). A personal graph sits on top of the enterprise graph.
- Approach: crawl and index, not live fetch. Connectors index structure, permission hierarchies and relationships.
- Permissions: crawler ingests source ACLs and mirrors them; checks happen at the retrieval layer before content reaches the LLM (Glean's claim).
- Freshness: described as continuous, governed by crawl frequency settings. No latency figure published on the pages.
- Numbers: none technical. Vendor says its answers were preferred about 2x over single-model enterprise plans (vendor claim, snippet).
- Hybrid search (dense plus BM25) is from third-party write-ups only. Verified: yes for the graph and permission facts; no for hybrid details.

### B2. Dropbox Dash
- URL opened: https://dropbox.tech/machine-learning/vp-josh-clemm-knowledge-graphs-mcp-and-dspy-dash (2026-01-28).
- Decision: they compared federated and index-based retrieval and chose index. Federated is fresh and needs no storage but depends on each source's speed and ranking and costs more tokens. Index gives company-wide reach, offline ranking experiments and speed, at the cost of connector work, storage and freshness limited by rate limits.
- Graph: relationships link items across apps (meeting to notes, attendees, tickets) and give canonical person IDs. They tried a graph database and found latency, query patterns and hybrid retrieval hard. They built relationships asynchronously into "knowledge bundles" that go through the normal chunk and embed pipeline.
- Permissions: connectors handle each app's ACL; results are filtered by access control and personalised before return.
- Numbers: some MCP-based agent queries took up to 45 seconds against seconds for the index. LLM context capped at about 100,000 tokens.
- Verified: yes. This is direct evidence against a graph database as the core, and for flattening graph relationships into the index.

### B3. Atlassian Rovo and Teamwork Graph
- URL opened: https://www.atlassian.com/blog/rovo/rovo-search-quality (2025-07-24). The Teamwork Graph product page returned no usable content.
- Data model: proprietary Teamwork Graph of people, projects, goals and tools. Third-party analysis (snippet only) lists connector types: synced (indexed), direct (live search API), smart link.
- Numbers (Atlassian, A/B test): 60% more successful results than the next leading enterprise search tool; ranking upgrades raised the main quality metric 10%; model and infra upgrade cut P90 latency 300 ms. Ranking uses recently viewed docs of the user and collaborators, and share and comment signals.
- Permissions: search stays consistent with source permissions; internals not published.
- Verified: yes for the blog; no for connector types.

### B4. Microsoft Graph, semantic index, Work IQ
- URL opened: https://learn.microsoft.com/en-us/microsoftsearch/semantic-index-for-copilot (doc dated 2026-04-23, updated 2026-08-18).
- Data model: a lexical plus vector index built from Microsoft Graph content, at tenant and user level. Graph signals (people, social matching) drive personalisation. Copilot connectors bring third-party data into the Graph.
- Permissions: index results surface only if the user already has access; identity-based boundary honoured at grounding time. Sensitivity labels used in search trimming.
- Freshness: user-mailbox documents near real time; new SharePoint docs shared with 2 or more users daily; edits to already-indexed docs indexed immediately.
- Work IQ and federated MCP connectors (live read, not indexed): snippet only. Verified: yes for semantic index; no for Work IQ.

### B5. Notion AI and Slack search
- Not researched. No engineering source opened. Verified: no.

## C. Permission-aware graph retrieval

### C1. AuthZed / SpiceDB (Zanzibar-style) with RAG
- URL opened: https://www.pinecone.io/learn/rag-access-control/ (AuthZed author, 2026-01-08).
- Model: ReBAC stores access as a relationship graph. Each chunk carries a document ID that maps to the authorization object.
- Pre-filter: LookupResources returns allowed IDs, vector search is restricted to them. Post-filter: search first, then CheckPermission per hit (CheckBulkPermissions batches). Author says post-filter suits cases where most hits are allowed, pre-filter suits large corpora where few are allowed; LookupResources costs more than a single check.
- Number: the article says OpenAI uses SpiceDB to secure 37 billion documents for 5 million ChatGPT Connectors users (vendor claim, as reported there).
- Verified: yes.

### C2. OpenFGA / Auth0 FGA and Couchbase
- Snippets only: Auth0 FGA docs (https://auth0.com/ai/docs/intro-authorization-for-rag) and Couchbase blog (fetch returned 403). Same pre/post filter pattern; OpenFGA is a CNCF sandbox project. Verified: no.
- Cerbos: not researched.

## What this changes in our core

- Keep the pointer index plus hybrid search plus rerank as the base leg. The only direct test of graph methods against a strong dense retriever (HippoRAG 2) shows a small overall gain, about 3 F1 points. Plain GraphRAG and LightRAG scored below it. (evidence)
- Add the graph as a second retrieval leg fused by RRF, not as the core. Graphiti already does cosine plus BM25 plus graph BFS plus rerank. HippoRAG 2 shows PPR helps most on multi-hop. (evidence)
- Do not store the graph in a graph database for query serving. Dropbox tried one and moved relationships into index documents ("bundles"). Our adjacency lists with PPR are the lighter choice; bake common neighbourhoods into index entries. (evidence)
- Make edges bi-temporal (valid time and ingest time) and invalidate, never delete. This is the one capability plain vector+BM25 lacks, and it answers "what was true on date X". Zep's numbers do not prove retrieval gain over hybrid search. (evidence for the design; our inference for its value to us)
- Avoid LLM-built graphs at index time for the whole corpus. HippoRAG 2 costs about 9M input tokens per 11.7k passages and GraphRAG about 12x that. Prefer LazyGraphRAG-style cheap extraction plus query-time LLM work, or build LLM edges only for high-value sources. (evidence)
- Keep ACLs out of the graph's meaning. Glean, Microsoft and Dropbox all copy source ACLs at index time and filter before the LLM. Our acl_version pre-filter matches this. Graph traversal and PPR must run on the already-filtered subgraph, or a node's existence leaks. (evidence for the pattern; our inference for the traversal rule)
- For group-based sharing, evaluate a Zanzibar-style check service as the ACL source of truth, with post-filter on small result sets and pre-filter (LookupResources) only for narrow scopes. Cost of lookup is the stated trade-off. (evidence)
- The live-fetch design is the outlier. Dropbox found federated queries slower (agent queries up to 45 s) and costlier in tokens, and chose an index. Microsoft and Atlassian keep live fetch only for some connectors. Consider live fetch only for freshness and ACL re-check on the top few hits, not for candidate generation. (evidence for the tradeoff; our inference for the narrower role)

---

# Addendum: petabyte scale (owner constraint: scale and query speed first)

Added 2026-10-24. Sources opened this round: Atlassian Team '26 blog (https://www.atlassian.com/blog/company-news/teamwork-graph-team-26, verified yes), Dropbox semantic search post (https://dropbox.tech/machine-learning/selecting-model-semantic-search-dropbox-ai, verified yes), Hierarchical BM25 paper (https://arxiv.org/abs/2608.00229, abstract, verified yes, submitted 2026-07-31). Arithmetic marked "derived" is mine, from the cited tables.

## D1. Per-approach scale table

| Approach | Index cost (published) | Graph size growth | Update cost | Largest scale published | Petabyte verdict |
|---|---|---|---|---|---|
| Plain pointer index, dense plus BM25 | No LLM at index time. Embedding only. | None | Re-embed the changed chunk | Dropbox: over a trillion documents, exabytes (Dropbox's figure) | Affordable. Cost is embedding compute and vector storage, both controllable (see D3). |
| Zep / Graphiti | About 6 LLM steps per episode (extract, resolve entities, extract facts, resolve facts, time, contradiction). Paper gives no call count or per-TB cost. | Grows with every ingested episode: nodes, fact edges, and invalidated edges kept for history. No growth figure published. | Incremental, but each update repeats the LLM steps and a graph-database lookup for resolution. Default ingest concurrency 10. | LongMemEval chat histories, about 115k tokens per question. No corpus-scale test published. | Not affordable as a whole-corpus indexer. Fine for a small, high-value slice (people, projects, decisions). |
| Microsoft GraphRAG (full) | Per HippoRAG 2 Table 12: about 115.5M input and 36.1M output tokens for 11,656 passages. Derived: about 9.9k input tokens per passage. | Entities, relations, and community reports at several levels. | No cheap incremental path stated in the pages I opened. Community summaries must be regenerated when communities change (my reading, not stated). | Test corpora of about 1M tokens (Microsoft) or 11.7k passages (HippoRAG 2). | Not affordable. LLM tokens scale with every passage. |
| LightRAG | Per HippoRAG 2 Table 12: about 68.5M input and 18.3M output tokens for the same 11,656 passages. Derived: about 5.9k input tokens per passage. | Entity and relation graph | Claims an incremental update algorithm. Abstract gives no cost. | Small benchmark corpora | Not affordable, and it scored lowest on quality in the one independent table. |
| HippoRAG 2 | About 9.2M input and 3.0M output tokens for 11,656 passages. Derived: about 790 input and 257 output tokens per passage. | 96,944 nodes and 1.40M edges for 11,656 passages. Derived: about 120 edges per passage, 80% of them synonym edges. | New passages add phrase nodes and edges; PPR runs at query time over the whole graph (cost not published). | 11,656 passages, and similar-size sets | Not affordable as is. Per-passage LLM extraction plus edge growth of about 120 per passage breaks at petabytes. A cheaper variant could be used on a slice. |
| LazyGraphRAG | Same as vector RAG, about 0.1% of GraphRAG (Microsoft). No LLM at index time. | Concept co-occurrence graph from noun phrases. Size not published. | Cheap: re-extract noun phrases for the changed doc. | 5,590 news articles (Microsoft) | Index side is affordable. Query side is not free: LLM relevance tests per query, set by a budget, and the 700x gain is measured against GraphRAG global search, not against plain vector search. Speed at petabyte scale is untested. |
| Cognee | Not found | Not found | Not found | 24 HotPotQA questions (vendor) | Unknown. Verified no. |

Plain statement: at petabyte scale, any design that calls an LLM for every chunk or document at index time stops being affordable. That covers full GraphRAG, LightRAG, HippoRAG 2 as published, and Graphiti if pointed at the whole corpus. This is an inference from the token tables above; no vendor published a petabyte test of any of them. LazyGraphRAG indexing and the plain index are the only ones whose index cost does not scale with LLM tokens. (evidence for the token rates, our inference for the verdict)

## D2. How Glean, Dropbox, Atlassian and Microsoft keep the graph small

- Dropbox (verified yes): the graph is not a graph database and not over every chunk. Relationships (a meeting to its notes, attendees, tickets) are built asynchronously and written as summary-like "knowledge bundles" that flow through the normal chunk and embed pipeline. It also keeps canonical person IDs. The corpus is over a trillion documents and exabytes; the graph is a thin layer over it.
- Glean (verified yes for the model, no for sizes): the graph is built on content, people and activity, with content metadata (creator, times, type, folder) as the main attributes. No node or edge counts are published. A job posting says the search index serves queries over about hundreds of millions of documents (snippet only, verified no).
- Atlassian (verified yes): the graph holds over 150 billion objects and relationships combined (Atlassian). A Zacks article says 200 billion; verified no. The page does not say how it is pruned or deduplicated. A shareholder-letter snippet says relationships are pre-calculated, and a third-party guide says changes appear within 10 minutes and billions of data points are added weekly (both verified no). Scale is reached by pre-computing edges, not by LLM reading of text, but Atlassian does not say so.
- Microsoft (verified yes for the semantic index page): the vector index is separate from the Graph. The Graph holds content metadata and people/social signals; the semantic index searches "billions of vectors". Only text-based files are embedded, files up to 512 MB, and the tenant index only includes SharePoint content shared with two or more users (so private single-user files are skipped there). Tenant-level and user-level indexes are separate, which bounds each one.
- Common pattern (inference from the four): the graph is over entities and metadata (people, containers, links, activity), not over every chunk. Chunk-level work is only embeddings and BM25, which scale linearly and cheaply.

## D3. Cost controls from the scale evidence

- Dropbox keeps vector cost down by embedding two items per document (path and the first 512 tokens of content, not every chunk), with an 8-bit quantised vector that cuts each embedding to about 1 KB, within a 4 KB per-document vector budget. They tested 11 models and chose multilingual-e5-large. They report no latency numbers. (evidence)
- Dropbox's older full-text engine targeted under 250 ms at p95 and new content searchable in under 10 s at p95, with writes about 10x reads. These are design targets, not Dash measurements. (evidence, targets only)
- Lexical search at one billion documents: flat BM25 is about 400 GB and 4 to 12 s per query on disk. Hierarchical BM25 holds 4.4 GB resident and answers in about 300 ms for 16-term queries, but its billion-scale recall is stated as not yet measured. It is a single new paper, not a product. (evidence)

## D4. What this adds to "What this changes in our core" (petabyte priority)

Replaces nothing above; these bullets are added.

- Build the graph over entities and metadata only (people, containers, links, activity, ACL groups), and bake neighbourhoods into index entries as Dropbox does. Do not build a chunk-level or LLM-extracted graph over the corpus. (evidence for the pattern; our inference for making it a rule)
- Index cost must not scale with LLM tokens. Per-passage LLM extraction (about 790 to about 9.9k input tokens per passage in the published tables) is the line that fails at petabytes. Keep LLM graph building to a small, high-value slice such as decisions, incidents and customers. (evidence for the rates, our inference for the line)
- Control vector cost first: embed per document or per section rather than every chunk where acceptable, quantise to 8-bit, and set a per-document vector byte budget. (evidence)
- Shard the index per tenant and per source, as Microsoft splits tenant and user indexes, so each shard and each PPR run stays bounded. Run PPR on a bounded subgraph around the query seeds, not the whole graph. (evidence for the sharding; our inference for bounded PPR, since no PPR latency at scale was published)
- Treat live fetch as top-k verification only (freshness and ACL re-check), not candidate generation. At petabyte scale it adds per-source latency to every query. (evidence from Dropbox; our inference for the scale case)
- Cheapest graph-style gain to try first: LazyGraphRAG-style noun-phrase concept graph at index time, with query-time LLM work behind a hard budget. Test it against our hybrid baseline, because Microsoft only compared it to other graph methods and vector RAG on one 5,590-article corpus. (evidence for cost; our inference for the plan)
- Gaps: no source tested any LLM-built graph beyond about 12 thousand passages (HippoRAG 2 table) or about 1.7M tokens (Microsoft), and no source published a petabyte query latency for a graph method. We must run our own scale test before choosing. (evidence for the gap)
