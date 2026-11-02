# Vectorize: How to Build a Company Brain for AI Agents

- URL: https://vectorize.io/articles/how-to-build-company-brain
- Org: Vectorize (vendor of the Hindsight memory layer, so read the product picks as marketing)
- Status: fetched in full (26k characters)
- Why it is exact: the article defines "company brain" and its layers. It quotes Colrows ("shared, enforceable, evolving agreement") and Falconer, which are further exact sources we have not fetched yet.

## Definition

A company brain is the layer that turns data a company already has into context an agent can use. It needs four properties, and losing one means it is not a company brain:

1. Shared: one source of truth.
2. Enforceable: every consumer compiles through it.
3. Evolving: stays current from live signals.
4. Agent-readable: structured, with per-user permissions enforced at query time.

## Four layers

| Layer | What it does |
| --- | --- |
| Ingestion | selective: canonical sources first, only what you can permission; real-time for decisions and deploys, batch for chat |
| Consolidation | extract observations, reconcile against held beliefs (recency, source or explicit policy), roll up into higher-order models |
| Retrieval | semantic, entity, temporal filter and graph traversal combined; permissions filtered at retrieval time |
| Action | agents read, act, and write outcomes back as new observations |

## Claims we can test against

1. Consolidation is the property that separates a brain from a wiki, graph or vector store. A system that only stores and retrieves is "a vector store with extra steps".
2. Permissions are enforced at retrieval, per user and per query. The brain stores everything and filters by asker.
3. Contradictions are reconciled by a stated policy, not last edit wins.
4. Outcomes flow back into the brain.
5. Start with one high-pain workflow, not the whole company.

## Gaps in our code against it

No consolidation layer, no contradiction policy, no action or write-back layer. Retrieval has semantic, keyword and graph pieces, but no entity or temporal filter in the search path.
