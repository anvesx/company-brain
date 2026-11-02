# @brain/graph-sync

Turns a connector's listing into graph metadata. It implements the company-brain idea of a metadata graph built from connectors, with per-user permissions kept as edges: when an account is connected, each listed document becomes a node, each reader or group becomes a person or team node, and each ACL entry becomes a `can-read` edge. Document text is never read or stored (ADR 0004).

Source ideas, from the exact research cards in `docs/brain/research/exact/` (Slite, Meta, GBrain, Vectorize, Karpathy): a metadata-only graph filled from connectors, typed edges taken from explicit references (an ACL entry, a parent), no LLM extraction, and every fact keeps its source and validity (`source = connector.id`, `validTo` set instead of delete).

Spec: `docs/specs/service/graph-sync.md`. Depends on `@brain/core-types`, `@brain/connector-kit` and `@brain/graph-store`.

## Use

```ts
import { syncConnector } from "@brain/graph-sync";

const report = await syncConnector({ store, connector, tenant: "t1", now: Date.now, resolve }, { pageSize: 100, signal });
// { nodes, edges, removed, pages }
```

## Behaviour

- Pages through `connector.list` (page size 1 to 1000, default 100) and reads the full listing each run.
- A document node has `id = address`, plus title, version, `source = connector.id` and props `zone` and `updatedAt`. No text key.
- Each document has a `belongs-to` edge to a per-connector `project` node `connector:<connector.id>`. `ListedDoc` carries no parent, so the connector is the parent; this node also lets a run find the documents it owns.
- Principal ids are used as given, or passed through `resolve(kind, raw)`. A user and a group with the same id would share a node, so `resolve` should namespace them.
- Re-sync diffs against the graph: unchanged nodes and edges cause no write; a narrowed ACL closes stale `can-read` edges (`validTo` set, history kept).
- Documents of this connector missing from a complete listing are tombstoned. A failed or aborted run never tombstones.
- Connector throw gives `SyncError("CONNECTOR_FAILED")` with `cause`; pages already written stay and the next run converges. Abort between pages gives `ABORTED`. Bad page size, empty tenant or invalid graph input gives `BAD_INPUT`.
- Every write carries the tenant; two tenants syncing the same address do not collide.

## Develop

```sh
pnpm --filter @brain/graph-sync test
pnpm --filter @brain/graph-sync mutation   # Stryker, break below 80
```

Out of scope: webhooks, change cursors, entity-resolver wiring, apps/brain wiring.
