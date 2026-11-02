# Spec: graph-store

Tier: feature. Design cards: ix_link, ix_fresh, ix_att. ADR 0004. Legacy research (removed from the repo, not an exact source): zep, temporal-validity, lightrag.

Exact source: [Slite](../../brain/research/exact/slite-company-brain-solutions.md), [Meta](../../brain/research/exact/meta-organizational-second-brain.md) (bi-temporal validity), [GBrain](../../brain/research/exact/gbrain.md) (typed edges, no LLM extraction). Audit table: [exact research README](../../brain/research/exact/README.md).

## Purpose
Metadata-only property graph for the brain app. Nodes and typed edges, tenant id on every row, bi-temporal validity so a changed fact closes the old one instead of overwriting it. No document text, no embeddings.

## Reuse decision
`node:sqlite` (already used by the repo). Kuzu is the upgrade path, not v1. We write only the schema and the traversal; no graph library fits a tenant-first SQLite table.

## Public interface
```ts
type NodeKind = "person"|"team"|"document"|"repo"|"channel"|"ticket"|"project";
type EdgeKind = "authored"|"member-of"|"mentions"|"links-to"|"belongs-to"|"can-read";
interface GraphNode { tenant: string; id: string; kind: NodeKind; source: string; address: string; title: string; version: string; props: Record<string,string> }
interface Edge { tenant: string; from: string; to: string; kind: EdgeKind; source: string }
interface GraphStore {
  upsertNode(n: GraphNode, at: number): void;           // same id, changed props: old row gets validTo=at
  addEdge(e: Edge, at: number): void;                   // idempotent
  removeEdge(e: Edge, at: number): void;                // sets validTo, never deletes
  tombstone(tenant: string, id: string, at: number): void;
  node(tenant: string, id: string, asOf?: number): GraphNode | undefined;
  neighbors(tenant: string, id: string, opts?: { kind?: EdgeKind; dir?: "out"|"in"; asOf?: number }): Edge[];
  reach(tenant: string, from: string, opts: { kinds: EdgeKind[]; depth: number; limit: number; asOf?: number }): GraphNode[];
  history(tenant: string, id: string): GraphNode[];
  close(): void;
}
createGraphStore(opts: { path: string }): GraphStore;   // ":memory:" not allowed in non-test use
class GraphError extends Error { code: "BAD_INPUT"|"DEPTH_LIMIT"|"CLOSED" }
```

## Behaviour
1. Every query filters by tenant first; a read with another tenant returns nothing.
2. Valid-time columns validFrom, validTo (null = current). `asOf` reads the row valid at that time.
3. upsertNode with identical content is a no-op; changed content closes the old row and inserts a new one.
4. Edges to unknown nodes are allowed (the other side may sync later); reach skips missing nodes.
5. reach is breadth-first, cycle-safe, capped by depth (max 6, else DEPTH_LIMIT) and limit.
6. props hold metadata only; values over 1 KiB or body-like key (`text`, `body`, `content`, `summary`, `excerpt`, `transcript` and similar, compared without case or punctuation) throw BAD_INPUT.
7. tombstone closes the node and all its edges.
8. After close() every call throws CLOSED. WAL and shm files are removed.

## Acceptance tests (written first)
- unit: tenant isolation, as-of reads, supersession, no-op upsert, cycle, depth cap, forbidden props, unicode ids.
- integration: real SQLite file, reopen persists, two OS processes writing, 10k nodes / 50k edges reach under 200 ms.
- mutation: Stryker score >= 80.

## Layout
`features/graph-store/{src,tests}`; src: schema.ts, nodes.ts, edges.ts, reach.ts, index.ts. Each file <= 80 lines.

## Out of scope
Entity resolution, connector sync, LLM extraction, Kuzu.
