# Spec: graph-view

Tier: feature (`features/graph-view`), mounted by the brain app. ADR 0004 (graph only).
Depends on `@anvesx/graph-store` and `@anvesx/identity` (port).

Exact source: our proposal. The look follows the owner's reference: a 3D force graph on
black, glowing nodes, labels on hover, grouped by category.

## Purpose
The most important page. Everything stored in the graph that the signed-in person may see,
drawn as a 3D force-directed graph, grouped and coloured by category (node kind, then source),
with the access rule of the brain app applied to every node and edge. A person sees their
documents, the people and teams that can read them, the projects they belong to, and nothing
outside their reach.

## Reuse decision
`3d-force-graph` 1.80.2 (MIT, three.js under it) served from `node_modules` as a byte-for-byte
script route, like `/webauthn.js`. Bloom through its `postProcessingComposer()` and
three's `UnrealBloomPass`. A custom cluster force per category (`d3Force`), because
`d3-force-cluster-3d` is archived. We write: the access-filtered graph query, the JSON route,
the page, the category legend and the tests.

## Public interface
```ts
interface GraphViewQuery { tenant: string; user: string; asOf?: number; limit?: number /* default 5000, max 20000 */; cursor?: string }
interface GraphViewPage { nodes: { id: string; kind: NodeKind; source: string; title: string; group: string }[];
  edges: { from: string; to: string; kind: EdgeKind }[]; categories: { group: string; count: number }[]; next?: string }
visibleGraph(store: GraphStore, q: GraphViewQuery): GraphViewPage
mountGraphView(app: Hono, deps: { store: GraphStore; port: IdentityPort }): void // GET /graph, GET /v1/graph, GET /3d-force-graph.js
```

## Behaviour
1. Visible set = the user's node, their teams (`member-of` out), every document those principals `can-read`, the projects and repos those documents `belong-to`, and every other principal with `can-read` on a visible document. Edges are included only when both ends are visible. Nothing else, ever: a document the user cannot read is not a node, not an edge end, not a count.
2. `group` is `<kind>` for principals and `<kind>:<source>` for documents, so each connector is its own cluster. `categories` counts visible nodes per group.
3. Paging by cursor on node id; a page carries edges only among nodes already sent plus the page. 5,000 nodes default, 20,000 max; above that the page says `next`.
4. `GET /v1/graph` needs the identity port (session or bearer); 401 with the challenge otherwise. `GET /graph` needs a session; otherwise 302 to `/sign-in`.
5. The page: black canvas, nodes coloured by group, bloom pass, labels on hover, click focuses the camera on the node and lists its neighbours in a side panel, a legend of categories with counts that toggles a group, a search box over titles. Pointer interaction stays on; drag is off above 2,000 nodes; `warmupTicks` 60, `cooldownTicks` 200.
6. Performance: `visibleGraph` for a user with 10,000 readable documents and 50,000 edges returns in under 300 ms on the integration machine; the page reaches a steady frame after cooldown with 5,000 nodes in Chromium (e2e measures `cooldownTicks` completion under 15 s).
7. Props are never sent: only id, kind, source, title, group. No address, no version.
8. `asOf` draws the graph as it was at that time, through the store's bitemporal reads.

## Acceptance tests (written first)
- unit: visibility set with two users, a team, a shared document, a project; edge both-ends rule; group naming; cursor paging; limit bounds; asOf.
- integration: real store file, 10k documents / 50k edges under 300 ms; `/v1/graph` 401 without a caller, tenant isolation (other tenant's rows absent).
- e2e: Chromium signs in, opens `/graph`, waits for the engine stop event, counts rendered nodes against the JSON, toggles a category, screenshots in light and dark.
- mutation: Stryker >= 80 on `visibleGraph`.

## Layout
`features/graph-view/{src/{query/{visible.ts,page.ts,groups.ts},routes/{mount.ts,assets.ts},page/{view.ts,script.ts,legend.ts},index.ts},tests/{unit,integration,e2e},README.md}`. Each file under 80 lines.

## Out of scope
Editing the graph from the page, text search inside documents (RAG app), 2D fallback.
