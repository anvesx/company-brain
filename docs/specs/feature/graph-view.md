# Spec: graph-view

Tier: module (`modules/graph-view`), mounted by the brain app. ADR 0004 (graph only), ADR 0008 (identity port).
Depends on `@anvesx/graph-store` and `@anvesx/identity` (port). A feature may depend on nothing but
`core-types` (tools/structure-lint/src/tiers.ts), so a package that composes two features is a module.

Exact source: our proposal. The look follows the owner's reference: a 3D force graph on
black, glowing nodes, labels on hover, grouped by category.

## Purpose
The most important page. Everything stored in the graph that the signed-in person may see,
drawn as a 3D force-directed graph, grouped and coloured by category (node kind, then source),
with the access rule of the brain app applied to every node and edge. A person sees their
documents, the people and teams that can read them, the projects they belong to, and nothing
outside their reach.

## Reuse decision
Install, not build (C1). `3d-force-graph` 1.80.2 (MIT, three.js under it) served from `node_modules`
as a byte-for-byte script route, like identity's `/webauthn.js`. Bloom through its
`postProcessingComposer()` and three's `UnrealBloomPass`, loaded as ES modules from an allowlist of
six `three` 0.187.0 files and one import map. A custom cluster force per category (`d3Force`), because
`d3-force-cluster-3d` is archived. We write: the access-filtered graph query, the JSON route, the page,
the category legend and the tests.

## Public interface
```ts
interface GraphViewQuery { tenant: string; user: string; aliases?: string[]; asOf?: number; limit?: number /* default 5000, 1..20000 */; cursor?: string; cursorKey: Uint8Array /* 32 bytes, injected */ }
interface GraphViewPage { nodes: { id: string; kind: NodeKind; source: string; title: string; group: string }[];
  edges: { from: string; to: string; kind: EdgeKind }[]; categories: { group: string; count: number }[]; next?: string }
visibleGraph(store: GraphStore, q: GraphViewQuery): GraphViewPage   // throws GraphError BAD_INPUT on a bad limit, cursor, asOf or cursorKey
mountGraphView(app: Hono, deps: { store: GraphStore; port: IdentityPort; aliases?: (user: string) => Promise<string[]>; cursorKey: Uint8Array }): void   // a key that is not 32 bytes throws BAD_INPUT at mount
// GET /graph, /graph.js, /v1/graph, /3d-force-graph.js, /vendor/three/<allowlisted file>
```

## Behaviour
1. Visible set = the user's node, their teams (`member-of` out, for the user id and for every alias: other names the sources know the user by, such as an email, which ACLs may name instead; a `member-of` target with no team node still grants access but is not drawn), every document those principals `can-read`, the projects and repos those documents `belong-to` (targets of any other kind are not added), and every other principal with `can-read` on a visible document. Edges are included only when both ends are visible, whatever their kind (a `can-read` from a visible person to a visible project counts). Nothing else, ever: a document the user cannot read is not a node, not an edge end, not a count. Tombstoned rows are gone.
2. `group` is `document:<source>` for documents and `<kind>` for every other node, so each connector is its own cluster and principals do not split by source. `categories` counts visible nodes per group, sorted by group, and are totals for the whole visible set on every page.
3. Nodes are sorted by id and paged by an opaque cursor. Each edge is sent exactly once: on the first page where both ends are in (sent so far) ∪ (this page), with at least one end in this page. The cursor is an HMAC over tenant and user, keyed by the injected `cursorKey` (the brain derives it from the auth secret with HKDF, so every instance accepts every instance's cursors); a cursor that was not signed for this caller, or with another key, is BAD_INPUT. Limit defaults to 5,000 and accepts integers 1..20,000, written as plain ASCII digits; anything else throws `GraphError` BAD_INPUT and the route answers 400. A page that leaves nodes behind says `next`; the last page has none.
4. `GET /v1/graph` needs the identity port (session or MCP bearer); 401 with the challenge header otherwise. Tenant and user come only from the caller, never from query parameters. The 200, 400 and 401 answers carry `cache-control: no-store`. `asOf` must be a safe integer of 0 or more, written as plain ASCII digits: empty, negative, fractional, signed, exponent, hex or non-numeric is a 400, as is a bad cursor. `GET /graph` needs a session; otherwise 302 to `/sign-in` (a bearer alone is not a session).
5. The page: black canvas, nodes coloured by group, bloom pass, labels on hover, click focuses the camera on the node and lists its neighbours in a side panel, a legend of categories with counts that toggles a group, a search box over titles. Pointer interaction stays on; drag is off above 2,000 nodes; `warmupTicks` 150 (260 under prefers-reduced-motion), `cooldownTicks` 0: the layout is computed before the first paint and never animates after it, which is what lets 4,000 nodes stop in about 6 s instead of animating through hundreds of slow frames. The canvas is the size of `#graph`, follows window resizes, and a 401 from `/v1/graph` sends the person to `/sign-in`. No inline script except the import map and no inline style; the page script is `/graph.js` and the styles are `/graph.css`. `GET /graph` sends `Content-Security-Policy: default-src 'self'; script-src 'self' 'sha256-<hash of the import map>'; style-src 'self'; img-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'`. The hash is there because a browser refuses an inline import map under `script-src 'self'` alone (found in the e2e: the bloom module could not resolve `three`); it admits that one data block and no other inline script.
6. Performance: `visibleGraph` for a user with 10,000 readable documents and 50,000 edges returns in under 300 ms on a warm store (tests/scale prints the time). The 300 ms assertion is load-gated: it runs only while the 1-minute load average is under half the cores, otherwise the test prints the measurement and is reported as skipped; a quiet CI machine always enforces it. The e2e measures warmup-to-stop: from navigation until `onEngineStop` fires, within 15 s with 4,323 nodes in Chromium.
7. Props are never sent: node keys are exactly id, kind, source, title, group; edge keys exactly from, to, kind. No address, no version.
8. `asOf` draws the graph as it was at that time, through the store's bitemporal reads.
9. Assets: `/3d-force-graph.js` is byte-equal to `3d-force-graph/dist/3d-force-graph.min.js`. `/vendor/three/<path>` serves exactly `build/three.module.js`, `build/three.core.js`, `examples/jsm/postprocessing/UnrealBloomPass.js`, `examples/jsm/postprocessing/Pass.js`, `examples/jsm/shaders/CopyShader.js`, `examples/jsm/shaders/LuminosityHighPassShader.js`, byte-equal to the installed `three`; every other path is 404. The import map is `{"imports":{"three":"/vendor/three/build/three.module.js"}}`.

## DOM contract (what e2e reads)
`#graph` holds the canvas and carries `data-engine="stopped"` after `onEngineStop`, `data-rendered-nodes`
(visible node objects in `scene()`) and `data-drag` (`on`/`off`). The legend is a `navigation` named
"Categories" with one `aria-pressed` button per group whose name holds the group and its count. The side
panel is a `region` named "Neighbours". Search is a `searchbox`. The canvas stays black in both colour
schemes; the legend follows `prefers-color-scheme`.

## Acceptance tests (written first)
- unit (`tests/unit/visible`, `tests/unit/paging`): visibility set with two users, a team, a shared document, a project; edge both-ends rule; group naming; cursor paging; limit bounds; asOf.
- scale (`tests/scale`): real store file, 10k documents / 50k edges under 300 ms, no leaks.
- integration (`tests/integration`): `/v1/graph` 401 without a caller, session and bearer, tenant isolation, params, `/graph`, assets.
- e2e (`tests/e2e`): Chromium signs up, opens `/graph`, waits for engine stop, counts rendered nodes against the JSON, toggles a category, searches, colour-scheme check; hardening.test.ts adds CSP, bloom, resize, 401 and zoom screenshots.
- mutation: Stryker >= 80 on `src/query`.

## Layout
`modules/graph-view/{src/{query,routes,page,index.ts},tests/{support,unit/{visible,paging},scale,integration,e2e},README.md}`.
Each code file under 80 lines, at most five files per folder, a README in each folder.

## Out of scope
Editing the graph from the page, text search inside documents (RAG app), 2D fallback.

## Changes from the first draft (2026-11-06)
Tier feature -> module (tier rule). Added `/graph.js` and the three allowlist plus import map (no inline
JS; bloom needs three's ES modules). Group for non-documents is `<kind>` alone. Limit errors and the
exact paging edge rule pinned. `belongs-to` adds only projects and repos. DOM contract added. The 300 ms
test moved to `tests/scale` so mutation runs skip it.
