# Spec: graph-sync

Tier: service. ADR 0004. Design cards: ix_link, ix_fresh, ac_grp, ac_scim (membership sync, step 3a, our proposal for the mechanism; the cards require it). Depends on `@anvesx/core-types`, `@anvesx/connector-kit` (types only) and `@anvesx/graph-store`.

Exact source: [Slite](../../brain/research/exact/slite-company-brain-solutions.md), [Meta](../../brain/research/exact/meta-organizational-second-brain.md), [GBrain](../../brain/research/exact/gbrain.md) (graph filled from connectors, metadata only). Audit table: [exact research README](../../brain/research/exact/README.md).

## Purpose
When a user connects an account, turn the connector's listing into graph metadata: document nodes, owner and group nodes, `can-read` edges from the ACL, `belongs-to` edges from the parent. Never read document text. This is the write path of the graph-only brain.

## Reuse decision
No library fits. Reuses `Connector.list` from connector-kit and `GraphStore` from graph-store. Entity resolution is injected as a function so this package does not depend on `@anvesx/entity-resolver`.

## Public interface
```ts
interface SyncDeps { store: GraphStore; connector: Connector; tenant: string; now: () => number; resolve?: (kind: "person"|"team", raw: string) => string }
interface SyncReport { nodes: number; edges: number; removed: number; pages: number; skipped: { address: string; message: string }[] }
syncConnector(deps: SyncDeps, opts?: { pageSize?: number; signal?: AbortSignal }): Promise<SyncReport>
class SyncError extends Error { code: "ABORTED"|"CONNECTOR_FAILED"|"BAD_INPUT"|"SUPERSEDED" }
```

## Behaviour
1. Pages through `connector.list` until no `nextCursor`; page size default 100, max 1000.
2. Each ListedDoc becomes a `document` node: id = `<connector.id>/<address>` (not prefixed twice when the address already starts so), address as listed, title, version, source = connector.id, props = `{zone, updatedAt}`. No text key is ever set.
3. `acl.allowUsers` becomes a `person` node plus a `can-read` edge person to document. `allowGroups` becomes `team` nodes plus `can-read` edges. Ids pass through `resolve` when given.
3a. When the connector implements `listMemberships()`, each `{ group, user }` pair becomes a `member-of` edge person to team, written by that connector. Edges the connector wrote and no longer reports are closed. A failing listing aborts the run before any edge is closed. Without the method nothing changes.
4. Re-sync is idempotent: unchanged docs write nothing; a changed ACL removes the stale `can-read` edges (validTo set) and adds the new ones.
5. A document present in the graph for this connector but missing from the full listing is tombstoned.
6. A connector throw becomes `SyncError("CONNECTOR_FAILED")` with the cause; partial pages already written stay, and the next run converges.
7. `signal` aborted between pages throws `SyncError("ABORTED")`.
8. Tenant is on every write. Two tenants syncing the same address do not collide.
9. Two connectors in one tenant listing the same address get two nodes with their own ACLs (review H1). A document id owned by another source is skipped, never overwritten. A connector id containing `/` is `BAD_INPUT`.
10. Runs of one (tenant, connector) are ordered: a run that is no longer the newest throws `SyncError("SUPERSEDED")` before its next write or tombstone (H2). In-memory, one process; not a cross-process lock.
11. A bad entry (invalid address, title, version or principal, or a bad membership pair) is skipped and listed in `report.skipped`; the run completes and tombstones deleted documents (H3). A skipped document fails closed: its `can-read` edges from this connector are closed and it is not tombstoned.
12. A principal node is written once, by the first source that lists it (M8). A principal id already held with another kind (user vs group, or a document node), by an earlier run, an earlier document of the run or the same document, is refused: the listing document is skipped and reported, fail closed (M3, partial: no default namespacing). A document id held by a person or team is refused the same way.
13. Two different addresses mapping to one node id: the first wins, the later is skipped and reported; the first is untouched.

## Acceptance tests (written first)
- unit: two connectors same address, overlapping and stale runs, poison address and CJK principal, membership poison, shared principal, user/group clash; ACL to edges, group nodes, resolve hook, no text props, idempotent re-sync (spy on store counts via real store), ACL narrowing closes edges, deletion tombstones, abort, connector failure, page size bounds, unicode addresses.
- integration: real `createGraphStore` file, real folder connector from `@anvesx/connector-kit` over a temp directory; sync, mutate files and ACLs, re-sync, assert `reach` and `neighbors` results.
- scale: 5k documents with 20 readers each syncs under 20 s.
- mutation: Stryker score >= 80.

## Layout
`services/graph-sync/{src,tests}`; src: sync.ts, lease.ts, types.ts, index.ts; write/: document.ts, access.ts, skip.ts; membership/: sync.ts. Each file <= 80 lines, at most 5 files per folder, README in every folder.

## Out of scope
Webhooks, change cursors (full listing only in v1), entity-resolver wiring, apps/brain wiring.
