# Brief: graph-view, and the brain on identity

Spec: [docs/specs/feature/graph-view.md](../specs/feature/graph-view.md). ADRs 0004, 0008.
Route: mid-engineer (Sonnet). Logic and integration work, not scaffolding. About one focused session
per part: part 1 (graph-store), part 2 (query), part 3 (routes and page), part 4 (brain).

## Goal
Every frozen contract test below goes green. Nothing else changes in behaviour:
1. `@anvesx/graph-store` gains `nodesOf` and `edgesOf` (additive batch reads).
2. `@anvesx/graph-view` exports `visibleGraph`, `mountGraphView`, `GraphViewQuery`, `GraphViewPage`.
3. `apps/brain` runs on Hono and trusts identity's port instead of its own HMAC bearer.

Registry decision (C1): install `3d-force-graph` 1.80.2 and `three` 0.187.0 (MIT, already in
`modules/graph-view/package.json` and the lockfile). Build new only the query, routes and page.

## Frozen contract (do not edit; any diff here is rejected)
| Path | Tests |
| --- | --- |
| `features/graph-store/tests/unit/batch/` (`nodes.test.ts`, `edges.test.ts`) | 8 |
| `modules/graph-view/tests/**` (all of `support/`, `unit/`, `scale/`, `integration/`, `e2e/`) | 65 (e2e skipped unless `PLAYWRIGHT=1`) |
| `apps/brain/tests/identity/` | 9 |

Red today for the right reason: `s.nodesOf is not a function`, `visibleGraph is not a function`,
`mountGraphView is not a function`, `secret must be at least 32 characters`.

## Files the builder owns
Each code file at most 80 lines, at most five files per folder, a `README.md` in every folder.

| Part | Files |
| --- | --- |
| 1 | `features/graph-store/src/edges/batch.ts`, `src/index.ts`, `src/schema.ts` (interface), a new `src/edges/` or `src/validation/` file if needed |
| 2 | `modules/graph-view/src/index.ts`, `src/query/*` (suggested: `visible.ts`, `groups.ts`, `page.ts`, `limits.ts`, `README.md`) |
| 3 | `modules/graph-view/src/routes/*` (`mount.ts`, `assets.ts`, `api.ts`), `src/page/*` (`view.ts`, `script.js` served as `/graph.js`, `legend.ts`, `README.md`) |
| 4 | `apps/brain/src/app.ts`, `src/index.ts`, `src/live/recheck.ts`, `src/live/source-recheck.ts`, `src/bin.ts`, `src/gate/README.md`; delete `src/gate/auth.ts` and `tests/gate/auth.test.ts`; migrate `tests/http.test.ts`, `tests/http-edges.test.ts`, `tests/recheck.test.ts`, `tests/live/*`, `tests/e2e/*` to `tests/identity/boot.ts` (same assertions, identity callers instead of signed tokens) |

## Rules mapped to tests
| Spec rule | Tests |
| --- | --- |
| 1 visible set | `unit/visible/visibility.test.ts`: alice sees herself, her team...; bob sees a different set...; a document nobody gave alice...; belongs-to adds only projects and repos...; a user with no node...; tenants never mix...; a tombstoned team stops granting... |
| 2 groups | `unit/visible/groups.test.ts`: all four |
| 3 paging and limits | `unit/paging/paging.test.ts`, `unit/paging/limits.test.ts`, `integration/params.test.ts`: limit and cursor page...; 400 on bad limit |
| 4 auth | `integration/api.test.ts`: all four; `integration/params.test.ts`: tenant and user always come from the caller...; `integration/page.test.ts`: the two redirects |
| 5 page | `integration/page.test.ts`: renders HTML..., serves the page script as a file; `e2e/graph.test.ts`: all three |
| 6 performance | `scale/visible.test.ts`: returns the whole visible graph in one page of 20,000, under 300 ms |
| 7 no props | `unit/visible/visibility.test.ts`: a node carries exactly...; no address, version or prop value... |
| 8 asOf | `unit/visible/asof.test.ts`: all five; `integration/params.test.ts`: asOf passes through |
| 9 assets | `integration/assets.test.ts` |
| graph-store 9 | `features/graph-store/tests/unit/batch/nodes.test.ts`, `edges.test.ts` |
| ADR 0008 in brain | `apps/brain/tests/identity/documents.test.ts`, `graph.test.ts` |

## Serving the library byte for byte
Copy the pattern of `features/identity/src/pages/passkey/assets.ts` (the `/webauthn.js` route): resolve
the package with `createRequire(import.meta.url)`, read the file once at mount, answer with
`content-type: text/javascript` and the exact bytes. Paths:
- `/3d-force-graph.js`: `join(dirname(require.resolve("3d-force-graph")), "3d-force-graph.min.js")`.
- `/vendor/three/<p>`: `join(dirname(require.resolve("three")), "..", p)` for the six allowlisted `p`
  in spec rule 9, a fixed `Map`, never a path join on user input. Anything else, `..` encoded or not, is 404.
The HTML holds one inline script: `<script type="importmap">{"imports":{"three":"/vendor/three/build/three.module.js"}}</script>`.

## node:http vs Hono: Hono
`identity.routes` is a Hono app, `mountGraphView` takes a Hono app, and brain-mcp mounts on Hono. The
session cookie only reaches `/graph` and `/v1/graph` when sign-in and the graph live on one origin, and
`fromBearer` checks tokens against identity's JWKS at the same base URL. Keeping `node:http` would mean
a hand-written bridge from Node requests to `fetch` Requests for every Hono sub-app; `@hono/node-server`
(MIT, already used by identity's tests) is that bridge. So `createBrainApp` builds one Hono app and serves
it with `createAdaptorServer`, keeping the `{ server, listen, close }` shape. New deps:
`BrainDeps = { store, identity: ReturnType<typeof createIdentity>, recheck?, port?, host? }`. Order:
`app.route("/", identity.routes)`, `/v1/documents*` behind `identity.protect`, `mountGraphView(app, { store, port: identity.port })`.
`Caller` becomes identity's `Caller`; `Recheck` takes it.

## 3d-force-graph API to use (real names, v1.80.2)
`ForceGraph3D()(el)`, `.graphData({nodes, links})`, `.backgroundColor("#000000")`, `.nodeAutoColorBy("group")`,
`.nodeLabel("title")`, `.nodeVisibility(fn)`, `.onNodeClick(fn)`, `.onNodeHover(fn)`, `.enableNodeDrag(bool)`,
`.enablePointerInteraction(true)`, `.warmupTicks(60)`, `.cooldownTicks(200)`, `.onEngineStop(fn)`,
`.d3Force("cluster", fn)`, `.cameraPosition(pos, lookAt, ms)`, `.zoomToFit(ms)`, `.postProcessingComposer()`
with `new UnrealBloomPass(...)` from `three/examples/jsm/postprocessing/UnrealBloomPass.js`, `.scene()`.
Count rendered nodes by walking `scene()` for visible objects with `__graphObjType === "node"`.
Links use `source`/`target`; map `from`/`to` in the page script.

## Commands (all must pass before commit)
```bash
pnpm --filter @anvesx/graph-store --filter @anvesx/identity build   # tests import built deps
pnpm --filter @anvesx/graph-store test
pnpm --filter @anvesx/graph-view test          # unit, integration, scale (prints the ms)
pnpm --filter @anvesx/graph-view e2e           # Chromium; screenshots in tests/e2e/shots
pnpm --filter @anvesx/brain-app test
pnpm --filter @anvesx/graph-view typecheck && pnpm --filter @anvesx/brain-app typecheck
pnpm --filter @anvesx/graph-view mutation      # stryker.config.json, src/query, breaks below 80
pnpm exec biome check modules/graph-view apps/brain features/graph-store
pnpm structure && pnpm guard:fakes
```
Evidence for review (VERIFICATION doctrine): the vitest tails, the printed scale time, the Stryker score,
the two screenshots.

## Owner's rules
No stubs, fakes or placeholder data; no tests just for green; OSI libraries only; minimal hand-written
code; inline comments a junior can read; inject clock and I/O; structure lint must pass; commitlint subject
lower-case; commit body lines at most 100 columns; no attribution lines; never bypass hooks; never commit dist/.

## Human merge (A15)
The graph-store interface change (part 1) and the brain auth migration (part 4) go to a PR and stop.

## Out of scope
Editing the graph from the page; text search inside documents (RAG app); a 2D fallback; brain-mcp tools;
connector accounts; changing identity.

## Open items for the lead
1. Graph person ids vs identity user ids. Tests seed the graph with `caller.user` as the person id. Who
   maps a connector's person (slack `U123`) to an identity user is entity-resolver work, not this brief.
2. The brain now hosts identity's pages (`/sign-up`, `/sign-in`). `bin.ts` must pass identity config
   from the environment; no new config keys beyond identity's own.
3. `docs/specs/feature/mcp-server.md` places brain-mcp as a feature that depends on two features. Same
   tier conflict as graph-view had; it should be a module.
