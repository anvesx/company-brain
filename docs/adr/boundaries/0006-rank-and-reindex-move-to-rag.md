# 0006: Rank, reindex and the rank scale test move to rag

Status: accepted, 3 Nov 2026. Amends [0005](0005-connectors-and-rag-move-to-own-repos.md). Closes anvesx/company-brain#64 (H4).

## Decision

`features/rank`, the reindex step and the rank half of `tools/scale-k6` now live in [anvesx/rag](https://github.com/anvesx/rag) as `@rag/rank`, `@rag/reindex` and `tools/scale-k6`. This repo no longer holds any text index, which keeps `apps/brain` graph-only (ADR 0004). `tools/integration` and `tools/scale-k6` stay here for the graph and the connections app.

## Why a service, and why a listing

- Rank is a text index, so it belongs with rag. Rag's dependency rule forbids one feature importing another, so the reindex step is a service (`services/reindex`) over `@rag/rank` and `@rag/change-cursor`.
- The old reindex read the graph directly. Rag cannot depend on `graph-store`, `graph-sync` or `zone-policy`: they are not published. `@rag/reindex` takes a plain listing instead (`SourceDoc`: id, title, address, version, `updatedAt`, readers). This repo produces it with `sourceDocs` in `tools/integration/src/graph-docs.ts`.
- `zoneGate` here is generic over any `{ path, principals }` document and carries a `tag`. Rag's `Gate` has the same shape, so a zone gate plugs in without either repo importing the other.

## Hardcoded token removed

The old reindex called `connector.fetch(address, { token: "integration" })`. The token is now a required `token` argument of `reindex`, so no caller can fetch with a made-up credential by default. Rag's tests assert that the token reaches every fetch.

## Consequences

- The graph-to-rank run is no longer one test. Each repo tests its half; the halves meet at the `SourceDoc` shape, which is copied, not shared. No test covers both. A shared type would need a published contract package.
- `@rag/rank` and `@rag/reindex` are not published. Nothing outside rag consumes them yet.
- The rank scale numbers moved with the rank script and were not re-run after the move. The catalog numbers stay here.
- No CI change in either repo.
