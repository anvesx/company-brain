# Retrieval, agent memory and graph retrieval

Terms. Retrieval-augmented generation (RAG) lets a model answer from fetched text. The University of California, Los Angeles (UCLA) co-authored two papers here.

Fifteen cards. Index and gap table: [README.md](README.md). Where a card says "none stated", the research files give no figure.

| Paper | Number we use |
| --- | --- |
| Zep | 63.8% and 71.2% on LongMemEval-S, latency down about 90% |
| Mem0 | 26% better judge scores on LoCoMo, 91% lower p95 latency |
| LoCoMo | 50 dialogues |
| LongMemEval | 500 questions |

### Superintelligent Retrieval Agent (SIRA)
- Yang et al., Meta Superintelligence Labs and Rice, 2026. [arXiv 2605.06647](https://arxiv.org/abs/2605.06647).
- Finding: offline document enrichment with missing search words, for agents over organizational knowledge.
- Number we use: none stated.
- Spec: the brief, contextual retrieval. No feature spec yet.

### Learning to Program Retrievals (RPL)
- Kim et al., KAIST and Meta Superintelligence Labs, 2026. [arXiv 2610.24854](https://arxiv.org/abs/2610.24854).
- Finding: the model writes its own retrieval program from search primitives, trained by reinforcement learning.
- Number we use: none stated.
- Spec: query-router rules 2 to 6 are fixed rules, no LLM in v1.

### FRESCO
- An et al., Meta Superintelligence Labs and UCLA, 2026. [arXiv 2604.14227](https://arxiv.org/abs/2604.14227).
- Finding: rerankers prefer older, richer text over newer facts when the two conflict.
- Number we use: none stated.
- Spec: source-trust rule 5 (decay) and rule 6 (newest wins a tie).

### Context Language Models (CLM)
- Shao et al., University of Washington and Meta Superintelligence Labs, 2026. [arXiv 2609.37725](https://arxiv.org/abs/2609.37725).
- Finding: the model keeps its context as a file and edits it.
- Number we use: none stated.
- Spec: none.

### LogAct: Enabling Agentic Reliability via Shared Logs
- Balakrishnan et al., Meta, 2026. [arXiv 2604.07988](https://arxiv.org/abs/2604.07988).
- Finding: intended agent actions are logged and voted on before they run.
- Number we use: none stated.
- Spec: none. The brain serves reads and has no action log.

### Memory Layers at Scale
- Berges et al., Meta FAIR, 2024. [arXiv 2412.09764](https://arxiv.org/abs/2412.09764).
- Finding: a trainable key-value memory inside the model.
- Number we use: none stated.
- Spec: not applicable. We keep pointers, not weights.

### Zep: A Temporal Knowledge Graph Architecture for Agent Memory
- Rasmussen et al., Zep AI, 2025. [arXiv 2501.13956](https://arxiv.org/abs/2501.13956).
- Finding: four timestamps per edge; a contradiction closes the old edge. It can answer "what did we believe on date X".
- Number we use: 63.8% and 71.2% on LongMemEval-S, latency down about 90%.
- Spec: graph-store rule 2 stores valid time only. Adding `recorded_from` and `recorded_to` closes the gap.

### Mem0: Building Production-Ready AI Agents with Scalable Long-Term Memory
- Chhikara et al., Mem0, 2025. [arXiv 2504.19413](https://arxiv.org/abs/2504.19413).
- Finding: an LLM picks add, update, delete or no-op for each new fact.
- Number we use: 26% better judge scores than OpenAI memory on LoCoMo, 91% lower p95 latency.
- Spec: `services/graph-sync/src/sync.ts` diffs a full listing; no per-fact decision.

### A-Mem: Agentic Memory for LLM Agents
- Xu et al., 2025. [arXiv 2502.12110](https://arxiv.org/abs/2502.12110).
- Finding: notes link to each other and rewrite their neighbours.
- Number we use: none stated. The gap analysis found no strong use for us.
- Spec: graph-store has fixed edge kinds.

### MemGPT: Towards LLMs as Operating Systems
- Packer et al., 2023. [arXiv 2310.08560](https://arxiv.org/abs/2310.08560).
- Finding: paged context, working memory plus an archival store. Close to our pointer index with live fetch.
- Number we use: none stated.
- Spec: `docs/brain/BRIEF.md`. Not benchmarked.

### From Local to Global: A GraphRAG Approach to Query-Focused Summarization
- Edge et al., 2024. [arXiv 2404.16130](https://arxiv.org/abs/2404.16130).
- Finding: Leiden communities with summaries answer global theme questions. It rebuilds the whole graph.
- Number we use: none stated.
- Spec: none; no community layer.

### LightRAG: Simple and Fast Retrieval-Augmented Generation
- Guo et al., 2024. [arXiv 2410.05779](https://arxiv.org/abs/2410.05779).
- Finding: incremental update by set union, with no rebuild. A close match to our run-level diff.
- Number we use: none stated.
- Spec: change-cursor rule 4 (`diffListing`).

### HippoRAG 2: From RAG to Memory
- Gutierrez et al., 2025. [arXiv 2502.14802](https://arxiv.org/abs/2502.14802).
- Finding: personalised PageRank from the query's entities over a graph with passage nodes. Our search does not rank.
- Number we use: none stated. Metric to add: passage recall@5.
- Spec: graph-store rule 5, breadth-first with depth cap 6.

### LoCoMo: long-term conversational memory of LLM agents
- Maharana et al., 2024. [arXiv 2402.17753](https://arxiv.org/abs/2402.17753).
- Finding: 50 dialogues, about 300 turns and 9K tokens each, up to 35 sessions. We have no score on it.
- Number we use: 50 dialogues.
- Spec: none; not run.

### LongMemEval: Benchmarking Chat Assistants on Long-Term Interactive Memory
- Wu et al., UCLA and others, ICLR 2025. [arXiv 2410.10813](https://arxiv.org/abs/2410.10813).
- Finding: 500 questions over five abilities, including temporal reasoning and knowledge updates. Long-context models drop 30% to 60%.
- Number we use: 500 questions.
- Spec: none; not run.
