# Meta posts, systems and benchmarks

Nine cards. Index and gap table: [README.md](README.md). Numbers come from the abstracts and posts in `research/13-meta-and-scale`.

Terms. Retrieval-augmented generation (RAG) lets a model answer from fetched text. An architecture decision record (ADR) is a decision file in `docs/adr`. Facebook AI Research (FAIR) is Meta's research lab. Approximate nearest neighbour (ANN) search finds close vectors fast. Knowledge Discovery and Data Mining (KDD) is a conference.

### An Organizational Second Brain: Building an AI That Learns From Experts
- Sengar et al., Meta Engineering post, 2 Sep 2026. [Post](https://engineering.fb.com/2026/09/02/ml-applications/organizational-second-brain-ai-learns-from-experts/). No arXiv id.
- Finding: company knowledge kept as a file graph with routing indexes, with RAG kept separate. It is the same idea as ours.
- Number we use: 200+ knowledge files, about 80% fewer tokens per turn.
- Spec: ADR 0004; query-router rules 2 to 5.

### LLM Wiki (Karpathy)
- Karpathy, GitHub gist. [Gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f). No arXiv id.
- Finding: the pattern the Meta post links as the same one. Already an exact source in `../exact`.
- Number we use: none stated in the research files.
- Spec: ADR 0004.

### How Meta Used AI to Map Tribal Knowledge in Large-Scale Data Pipelines
- Meta Engineering post, 6 Apr 2026. [Post](https://engineering.fb.com/2026/04/06/developer-tools/how-meta-used-ai-to-map-tribal-knowledge-in-large-scale-data-pipelines/). No arXiv id.
- Finding: agents wrote context files for data pipelines. Code scope only.
- Number we use: 50+ agents wrote 59 context files.
- Spec: none. Not a company brain.

### MemoProAgent: Toward Memory-Driven Proactive Assistance
- facebookresearch repository, Oct 2026. [Repo](https://github.com/facebookresearch/Memo-Pro-Agent). No arXiv id yet.
- Finding: a graph of past events plus semantic memory, personal not company. Its `ppr` extra runs personalised PageRank.
- Number we use: none stated in the research files.
- Spec: graph-store rule 5 (breadth-first only).

### TAO: Facebook's Distributed Data Store for the Social Graph
- Bronson et al., USENIX ATC 2013. [Page](https://www.usenix.org/conference/atc13/technical-sessions/presentation/bronson). Not on arXiv.
- Finding: cache tiers in front of a graph store with read-after-write, inverse associations kept in sync, and a privacy check at each view.
- Number we use: a billion reads per second on many petabytes.
- Spec: graph-store (one SQLite file, no cache tier); the brief's live recheck.

### Unicorn: A System for Searching the Social Graph
- Curtiss et al., PVLDB vol 6, 2013. [PDF](http://www.vldb.org/pvldb/vol6/p1150-curtiss.pdf). Not on arXiv.
- Finding: an in-memory sharded graph index with multi-hop set operators. Privacy is checked when results are shown, not in the index.
- Number we use: tens of billions of nodes, trillions of edges, billions of queries a day, hundreds of ms.
- Spec: graph-store rule 5; connector-kit `canRead?`; the brief's live recheck.

### The Faiss library
- Guzhva et al., FAIR Meta and others, 2024. [arXiv 2401.08281](https://arxiv.org/abs/2401.08281).
- Finding: a vector index library with a predicate filter inside the search (IDSelector).
- Number we use: six benchmark sets of 1 billion vectors each.
- Spec: the brief's pre-filter inside ANN and BM25. No feature spec yet.

### CRAG: Comprehensive RAG Benchmark
- Yang et al., Meta Reality Labs and FAIR, 2024; ran as KDD Cup 2024. [arXiv 2406.04744](https://arxiv.org/abs/2406.04744).
- Finding: a question set that includes time-sensitive questions. We have no equivalent.
- Number we use: 4,409 question-answer pairs.
- Spec: change-cursor keeps data fresh; no benchmark.

### Embedding-based Retrieval in Facebook Search
- Huang et al., Facebook, 2020. [arXiv 2006.11632](https://arxiv.org/abs/2006.11632).
- Finding: nearest-neighbour search combined with boolean term match. Our fusion is reciprocal rank fusion.
- Number we use: none stated in the research files.
- Spec: the brief, reciprocal rank fusion with k=60. No offline recall metric.
