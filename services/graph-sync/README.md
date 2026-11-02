# @anvesx/graph-sync

Turns a connector's listing into graph metadata. It implements the company-brain idea of a metadata graph built from connectors, with per-user permissions kept as edges: when an account is connected, each listed document becomes a node, each reader or group becomes a person or team node, and each ACL entry becomes a `can-read` edge. Document text is never read or stored (ADR 0004).

Source ideas, from the exact research cards in `docs/brain/research/exact/` (Slite, Meta, GBrain, Vectorize, Karpathy): a metadata-only graph filled from connectors, typed edges taken from explicit references (an ACL entry, a parent), no LLM extraction, and every fact keeps its source and validity (`source = connector.id`, `validTo` set instead of delete).

Spec: `docs/specs/service/graph-sync.md`. Depends on `@anvesx/core-types`, `@anvesx/connector-kit` and `@anvesx/graph-store`.

## Use

```ts
import { syncConnector } from "@anvesx/graph-sync";

const report = await syncConnector({ store, connector, tenant: "t1", now: Date.now, resolve }, { pageSize: 100, signal });
// { nodes, edges, removed, pages, skipped }
```

## Behaviour

- Pages through `connector.list` (page size 1 to 1000, default 100) and reads the full listing each run.
- A document node has `id = <connector.id>/<address>` (an address that already starts with `<connector.id>/` is not prefixed twice), `address` as listed, title, version, `source = connector.id` and props `zone` and `updatedAt`. No text key. Two connectors in one tenant that list the same address get two nodes and separate ACLs. A document id already held by another source is skipped, never overwritten. A connector id containing `/` gives `BAD_INPUT`.
- Each document has a `belongs-to` edge to a per-connector `project` node `connector:<connector.id>`. `ListedDoc` carries no parent, so the connector is the parent; this node also lets a run find the documents it owns.
- Principal ids are used as given, or passed through `resolve(kind, raw)`. A principal node is written once, by the first source that lists it, so a person shared by two connectors causes no rewrite on later runs. A user and a group that resolve to the same id would share a node: the second kind is skipped and reported, so the kind never flips. `resolve` should still namespace them.
- Re-sync diffs against the graph: unchanged nodes and edges cause no write; a narrowed ACL closes stale `can-read` edges (`validTo` set, history kept).
- Documents of this connector missing from a complete listing are tombstoned. A failed or aborted run never tombstones.
- Connector throw gives `SyncError("CONNECTOR_FAILED")` with `cause`; pages already written stay and the next run converges. Abort between pages gives `ABORTED`. Bad page size, empty tenant, connector id with `/` or invalid root input gives `BAD_INPUT`.
- One bad entry never aborts the run. A document whose address, title, version or ACL principal fails graph validation (control character, over a byte cap) is skipped and listed in `report.skipped` as `{ address, message }`; so is a bad membership pair. Rule for a skipped document: fail closed. Its `can-read` edges from this connector are closed, it is not tombstoned, and the next run writes it whole once the entry is valid. Deleted documents still tombstone in the same run.
- Runs are ordered per (tenant, connector.id): a run that is no longer the newest stops with `SyncError("SUPERSEDED")` before its next write or tombstone, so a slow older run cannot restore an ACL a newer run narrowed. The order is kept in memory, so it covers runs in one process only; two processes sharing one graph file are not ordered.
- Every write carries the tenant; two tenants syncing the same address do not collide.

## Develop

```sh
pnpm --filter @anvesx/graph-sync test
pnpm --filter @anvesx/graph-sync mutation   # Stryker, break below 80
```

Out of scope: webhooks, change cursors, entity-resolver wiring, apps/brain wiring.
