# @anvesx/graph-view

The 3D graph page: everything in the graph the signed-in person may see, drawn with `3d-force-graph`
on black, grouped and coloured by category. Spec: `docs/specs/feature/graph-view.md`. Brief:
`docs/briefs/graph-view.md`.

Tier: module. It composes two features (`@anvesx/graph-store`, `@anvesx/identity`), which a feature may
not depend on (tools/structure-lint/src/tiers.ts).

```ts
visibleGraph(store, { tenant, user, cursorKey, aliases?, asOf?, limit?, cursor? }): GraphViewPage
mountGraphView(app: Hono, { store, port, cursorKey, aliases? }): void   // aliases: (user) => Promise<string[]>
// cursorKey: 32 secret bytes that sign "Load more" cursors. Instances that share it accept each other's cursors;
// any other length throws GraphError BAD_INPUT (at mount for mountGraphView).
// GET /graph, /graph.css, /graph.js, /v1/graph, /3d-force-graph.js, /vendor/three/<allowlisted file>
```

```bash
pnpm --filter @anvesx/graph-view test        # unit, integration, scale
pnpm --filter @anvesx/graph-view e2e         # Chromium (PLAYWRIGHT=1 pnpm --filter @anvesx/graph-view test also runs it)
pnpm --filter @anvesx/graph-view mutation    # Stryker on src/query, breaks below 80
```

Status: implemented. Unit, integration, scale and Chromium e2e suites pass. Run the whole thing with
`PLAYWRIGHT=1 pnpm --filter @anvesx/graph-view test`. Screenshots (light, dark, zoomed out and in) are
written to `tests/e2e/shots/` on every e2e run.

Visible edges: every edge whose two ends are both visible, `can-read` included. An edge to an invisible
end is never sent. Principals are the user id, the `aliases` result and every team any of them belongs to.

## Known

- Three is loaded twice. `3d-force-graph`'s UMD bundle embeds its own three, the bloom pass comes from the
  import-mapped three, so the console warns "Multiple instances of Three.js". Tried the ESM build instead:
  it needs bare specifiers beyond the vendored allowlist and injects styles. Left as is. Bloom works
  (`data-bloom="on"`, asserted in the e2e).
- CSP: `script-src` carries the sha256 of the inline import map, because `'self'` alone blocks it. The
  library injects `<style>` elements, which `style-src 'self'` blocks; the equivalent rules are served from
  `/graph.css`, and the e2e tolerates exactly those console errors.
