# Slite: Company brain solutions in 2026

- URL: https://slite.com/learn/company-brain-solutions
- Author and date: Christophe Pasquier, Slite, 10 Sep 2026
- Status: fetched in full (curl, 35k characters of text)
- Why it is exact: the whole article is about the "company brain" category by name. It compares ten products and interviews more than ten builders.

## What it says a company brain is

A company brain takes everything a company knows, in docs, in people's heads and across tools, and makes it usable as answers or context for people and agents.

## The four components every brain has

| Component | Options the article lists |
| --- | --- |
| Getting signals | scheduled pulls, event capture by webhook, agent ingestion, inference-time retrieval (store nothing) |
| Remembering | plain files, documents, vector index, knowledge graph with a validity window on every fact |
| Dreaming and pruning | consolidation runs, time decay, drift detection against live tools, human review queue |
| Speaking and searching | chat with citations, hybrid search, headless API or MCP, dedicated apps |

No product runs every option. Each picks one per component.

## Claims we can test our code against

1. System-owned entities (customers, tables, metrics) stay in their system and the brain points to them rather than copying them. This is our metadata-only rule (ADR 0004).
2. Knowledge people own (decisions, processes, definitions) lives in maintained documents with a status a human set.
3. Every brain that works has AI propose and a named owner approve, "like a pull request for knowledge". Unsupervised AI writes to company knowledge are not trusted.
4. Expose the brain through one interface, usually an MCP server, and give each agent an access level.
5. Facts can be marked expired instead of deleted (Zep and Graphiti). Time decay lowers retrieval weight of old facts (mem0).
6. Agent queries will outnumber human queries by orders of magnitude.
7. A stored graph is a retrieval choice, not a requirement, and it goes stale with every reorg. The article argues against a graph as a third source of truth.
8. Permissions are the second biggest worry (63%), after accuracy (77%). Maintenance is the main reason self-built brains die (27% gave up).

## Requirements this puts on Company Brain

| Requirement | Where it lands in code | State |
| --- | --- | --- |
| Getting signals: scheduled pull | connectors, graph-sync (spec only) | connectors built, graph-sync not |
| Getting signals: webhook | change-cursor, connector-runtime | built for retrieval path |
| Remembering: graph with validity | graph-store (bi-temporal) | built |
| Dreaming: consolidation run | none | not built |
| Pruning: time decay, expiry, drift | none | not built |
| Review queue before any write | none | not built |
| Speaking: hybrid search | hybrid-search | built |
| Speaking: MCP with per-agent access level | mcp-service, acl-filter | built, access levels per agent not built |
| Citations on every answer | query-router | partial |
