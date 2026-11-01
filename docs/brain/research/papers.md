# Research conclusions for an index-not-copy company brain

Each conclusion cites ids from papers.json. "search-snippet" items were confirmed on arXiv (title, authors, year) but their abstracts were not read; "fetched" items had abstracts read.

- Keep knowledge outside the model and fetch at query time. This is the original RAG pattern and the memory-as-paging pattern. (rag-orig, memgpt)
- A plain top-k similarity call is not enough. Pipelines fail in seven known places, and agents need exact and multi-step access. (seven-failures, direct-corpus)
- Put an entity and relationship graph over the pointers. It answers cross-app questions (who, which project, which ticket) that vector search alone cannot, and it can be built from links without copying source text. (graphrag, hipporag, hipporag2)
- Graph indexes must update incrementally. New events should add nodes and edges, not trigger a rebuild. (lightrag, freshdiskann, filtered-stale)
- Give every fact a validity time and a supersession link. Embedding similarity cannot separate a changed fact from a duplicate, and stale evidence can make a correct model wrong. (zep, temporal-validity, stale-poison)
- Store distilled facts with provenance, consolidate on write, and rank by recency and importance as well as similarity. (mem0, a-mem, generative-agents)
- Run permission and source filters inside the vector search, with the user's live permissions. Retrieval ranks by relevance, not authorization. (acorn, filtered-stale, multitenant-rag, participant-acl)
- Treat the index as sensitive data. Embeddings can be inverted to text, knowledge bases leak through answers, and crafted queries extract content. (embedding-inversion, rag-privacy, extraction-bench)
- Treat all fetched content as untrusted. Writers in any connected app can poison the brain or inject instructions; track source trust and strip instruction-like content. (poisoned-rag, indirect-injection)
- Route before retrieving. A planner or router that picks the source and the depth (none, single, multi-step) cuts cost and is the hard part on heterogeneous enterprise data. (adaptive-rag, unims-rag, multisource-agentic, self-rag, search-r1, agentic-rag-survey)
- Scale cost model: in-memory centroids or pointers with disk-resident detail suits a company-wide index; late interaction gives precision at a larger index cost. (spann, freshdiskann, colbert-plaid)
- If live fetch goes through MCP-style connectors, audit each connector for least privilege and use scoped tokens. (mcp-enterprise, mcp-audit)
- Evaluate on our own apps: freshness (change a fact, time to correct answer), multi-turn identifier-heavy tasks, source selection, and memory cost and latency. (freshllms, crag-bench, ragas, case-judge, anatomy-mem)
- Gaps: no paper found that directly tests an index-of-pointers design with live fetch against full-copy RAG; that comparison is ours to run. Newest 2026 preprints (filtered-stale, temporal-validity, stale-poison, multitenant-rag) are single or small-team arXiv papers, not yet peer-reviewed as far as we could see.
