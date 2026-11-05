# Filtered search, ranking, tenant isolation and ingestion

Terms. An access control list (ACL) says who may read a document. Key-value (KV) cache holds the attention tensors a model server reuses.

Ten cards. Index and gap table: [README.md](README.md). The ACL pre-filter source lives in the `anvesx/rag` repo; `apps/brain/src/gate/access.ts` checks `can-read` edges here.

### Filtered-DiskANN
- Gollapudi et al., Microsoft Research, WWW 2023. [PDF](https://harsha-simhadri.org/pubs/Filtered-DiskANN23.pdf). Not on arXiv.
- Finding: a graph index built with labels; works at filter specificity 1e-4 to 1e-6.
- Number we use: specificity 1e-4 to 1e-6. Metric to add: recall@10 by ACL specificity.
- Spec: the brief's pre-filter. No feature spec yet.

### ACORN
- Patel, Kraft et al., Stanford and DBOS, 2024. [arXiv 2403.04871](https://arxiv.org/abs/2403.04871).
- Finding: a denser graph index; search walks only nodes that pass the predicate.
- Number we use: none stated. Metric to add: queries per second at 0.9 recall.
- Spec: the brief's pre-filter.

### SIEVE
- Li et al., UIUC and Bytedance, 2025. [arXiv 2507.11907](https://arxiv.org/abs/2507.11907).
- Finding: sub-indexes for frequent filters, within a memory budget.
- Number we use: none stated. Metric to add: speedup per extra memory.
- Spec: the brief's pre-filter.

### Applying Deep Learning To Airbnb Search
- Haldar et al., Airbnb, 2018. [arXiv 1810.09591](https://arxiv.org/abs/1810.09591).
- Finding: learned ranking. We have no click or label data yet.
- Number we use: none stated. Metric to add later: NDCG on logged clicks.
- Spec: query-router is rule-based.

### LiNR: Model Based Neural Retrieval on GPUs at LinkedIn
- Borisyuk et al., LinkedIn, 2024. [arXiv 2407.13218](https://arxiv.org/abs/2407.13218).
- Finding: GPU retrieval at billion scale. Needs usage data first.
- Number we use: none stated.
- Spec: query-router is rule-based.

### The Good and The Bad: Exploring Privacy Issues in RAG
- Zeng et al., Michigan State and others, 2024. [arXiv 2402.16893](https://arxiv.org/abs/2402.16893).
- Finding: crafted prompts make the model print retrieved records.
- Number we use: verbatim leaks near 50% on Llama2-7b-Chat and GPT-3.5 Turbo.
- Spec: graph-store rule 1 scopes the tenant. No extraction test.

### The Early Bird Catches the Leak: Timing Side Channels in LLM Serving
- Song et al., 2024. [arXiv 2409.20002](https://arxiv.org/abs/2409.20002).
- Finding: time to first token reveals shared cache hits.
- Number we use: cache hits detected at 99% accuracy.
- Spec: none. A shared cache could leak across tenants.

### I Know What You Asked: Prompt Leakage via KV-Cache Sharing (PromptPeek)
- Wu et al., SUSTech and ByteDance, NDSS 2025. [PDF](https://ndss-symposium.org/wp-content/uploads/2025-1772-paper.pdf). Not on arXiv.
- Finding: KV-cache sharing lets one tenant rebuild another's prompt.
- Number we use: 99% average success on Llama2-13B.
- Spec: none.

### Large-scale Incremental Processing Using Distributed Transactions and Notifications (Percolator)
- Peng, Dabek, Google, OSDI 2010. [PDF](https://www.usenix.org/legacy/event/osdi10/tech/full_papers/Peng.pdf). Not on arXiv.
- Finding: incremental indexing with transactions and observers. Work scales with the change, not the corpus.
- Number we use: average document processing latency cut by a factor of 100; average document age in results down about 50%.
- Spec: `services/graph-sync/src/sync.ts` diffs a full listing; change-cursor rule 5 budgets 100k addresses in 500 ms.

### DBLog: A Watermark Based Change-Data-Capture Framework
- Andreakis, Papapanagiotou, Netflix, 2020. [arXiv 2010.12597](https://arxiv.org/abs/2010.12597).
- Finding: watermarks interleave log events with chunked table reads; pause and resume.
- Number we use: none stated. Metric to add: backfill resume point.
- Spec: change-cursor rule 3 (delta cursor only).

## Enterprise search blogs

No paper exists for these. [Dropbox Nautilus](https://dropbox.tech/machine-learning/architecture-of-nautilus-the-new-dropbox-search-engine) passes the user's namespaces into each query. [Slack search](https://slack.engineering/search-at-slack/) reports a 27% rise in clicks at position 1 after adding the work graph. [LinkedIn Galene](https://engineering.linkedin.com/search/did-you-mean-galene) pairs an offline base index with live updates.
