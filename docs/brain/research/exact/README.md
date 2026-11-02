# Exact company-brain research

Only sources that are literally about a "company brain" (or "organizational second brain") are kept here. Generic RAG, agent-memory and retrieval papers were removed on 2 Nov 2026; they stay in git history before the commit that removed them.

Code must match these sources. A package with no row here is a guess and is labelled "our proposal".

## Sources

| Card | Source | Status |
| --- | --- | --- |
| [slite-company-brain-solutions.md](slite-company-brain-solutions.md) | Slite, 10 Sep 2026 | fetched in full |
| [meta-organizational-second-brain.md](meta-organizational-second-brain.md) | Meta Engineering, 2 Sep 2026 | fetched in full |
| [gbrain.md](gbrain.md) | garrytan/gbrain README | fetched in full |
| [vectorize-how-to-build-company-brain.md](vectorize-how-to-build-company-brain.md) | Vectorize | fetched in full |
| [karpathy-llm-wiki.md](karpathy-llm-wiki.md) | Karpathy gist, 4 Apr 2026 | fetched in full, cited by Meta and Slite |

## Still to fetch

Colrows and Falconer (quoted by Vectorize), Slite's definition page (the fetched copy was an empty shell), ae.studio, the DEV four-part series, Foundation Capital on context graphs, MarvisX, knowledge_graph_brain, Meta's tribal-knowledge post. The InfoQ news item at the first URL tried returned 404; the working one is infoq.com/news/2026/09/meta-organizational-agents.

Supermemory, Zep, mem0 and Letta are memory SDKs that Slite lists as a family. They are not company brains, so they have no card.

## What the sources agree on

1. A brain is more than storage: signals in, a store, upkeep (consolidate, expire, detect drift), and a way to ask.
2. Upkeep is what separates a brain from a stale wiki.
3. Humans approve changes. Agents propose.
4. One interface (MCP) with per-user or per-agent access, enforced at retrieval.
5. RAG stays as a separate layer for sparse reference material.

## Audit of current code against them

| Requirement (source) | Package | Verdict |
| --- | --- | --- |
| Scheduled pull and webhook signals (Slite, Vectorize) | connectors, connector-runtime, change-cursor | built |
| Metadata graph with validity window (Slite, Meta) | graph-store | built, not wired into any app |
| Graph filled from connectors | graph-sync | spec only |
| Hybrid search (Slite, GBrain, Vectorize) | hybrid-search | built |
| Per-user permission at retrieval (Vectorize, Slite) | acl-filter | built |
| MCP interface (Slite, GBrain) | mcp-service | built |
| Consolidation, contradiction policy (Vectorize) | none | not built |
| Dream cycle, time decay, drift detection (Slite, GBrain) | none | not built |
| Review queue for every change (Slite, Meta) | none | not built |
| Routing index, dependency edges (Meta) | none | not built |
| Regression suite from corrections (Meta) | none | not built |
| Write-back of outcomes (Vectorize) | none | not built |
| Citations on every answer (Slite) | query-router | not built |
| query-router, zone-policy, MiniLM embedder | n/a | no exact source backs them: our proposal |

Source for the last row: the independent verifier's report on commit 86af37e.
