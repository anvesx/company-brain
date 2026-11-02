# 0005: Connectors and RAG move to their own repos

Status: accepted, 2 Nov 2026. Decided by the user. Connectors moved 2 Nov 2026; RAG moved 2 Nov 2026.

## Decision

Connectors (the catalog, adapters and custom-connector support) and RAG each get a separate repository. This repo keeps the brain, the connections app and the shared contracts.

## Consequences

- The connector contract (`connector-kit`) and `core-types` become published packages that the connectors repo and the brain both depend on. This is why the registry target decision matters.
- The connections app reads the catalog through the registry, never by path, so moving the adapters changes no app code.
- RAG already shares no database with the brain (ADR 0004), so it moved as `apps/rag` plus its rag-only features, services, modules and tools.
- Connectors moved to [anvesx/connectors](https://github.com/anvesx/connectors) as `@anvesx/connectors`. New connector work goes there.
- Registry decision still pending, so nothing is published. A git install of `connector-kit` cannot work (no build output in git, `workspace:*` between the two packages). Until a registry is chosen, the connectors repo links a sibling checkout of this repo, and this repo links a sibling checkout of the connectors repo (`link:` in `apps/connections` and `apps/brain`). The root `pnpm.overrides` entry for `@anvesx/connectors` and the `!apps/rag` workspace exclusion were removed with RAG. Recommended: GitHub Packages.
- RAG moved to [anvesx/rag](https://github.com/anvesx/rag). Removed from this repo: `apps/rag`, features acl-filter, audit-chain, chunker, hybrid-search, mcp-search-tool and pointer-registry, services audit-service, connector-runtime, embedder, index-service, mcp-service and query-service, modules governance, ingestion and retrieval, and tools integration, e2e and scale-test. Nothing remaining imported them. The brain and connections apps keep only change-cursor, connector-kit, core-types, graph-store, graph-sync, query-router and zone-policy.
