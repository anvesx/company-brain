# 0005: Connectors and RAG move to their own repos

Status: accepted, 2 Nov 2026. Decided by the user. Execution is later.

## Decision

Connectors (the catalog, adapters and custom-connector support) and RAG each get a separate repository. This repo keeps the brain, the connections app and the shared contracts.

## Consequences

- The connector contract (`connector-kit`) and `core-types` become published packages that the connectors repo and the brain both depend on. This is why the registry target decision matters.
- The connections app reads the catalog through the registry, never by path, so moving the adapters changes no app code.
- RAG already shares no database with the brain (ADR 0004), so it moves as `apps/rag` plus its services.
- Not done now. New connector work goes under `services/connectors` behind the manifest registry so the later move is a copy.
