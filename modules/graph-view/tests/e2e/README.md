# tests/e2e

Chromium against the real page: identity sign-up, the graph view and a graph-store file, all in one
process on a free port. Skipped unless `PLAYWRIGHT=1`, same switch as identity's e2e suite.

```bash
pnpm --filter @anvesx/graph-view e2e          # sets PLAYWRIGHT=1, runs files one after another
E2E_CHROMIUM_PATH=/path/to/chromium pnpm --filter @anvesx/graph-view e2e
```

| File                | What it gives or pins                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------- |
| `support.ts`        | `startE2e`, `signUpThroughPage`, `seedCompany` (4,323 visible nodes), `shot`.                 |
| `graph.test.ts`     | Engine stops in 15 s, rendered count = JSON, legend toggle, search + panel, light/dark shots. |
| `pixel.ts`          | `cornerPixel` (canvas is black) and `whiteShare` (bloom does not wash colours to white).      |
| `hardening.test.ts` | CSP, `data-bloom`, canvas fits `#graph` and follows resize, 401 redirect, zoom shots.         |
| `shots/`            | `graph-*`, `graph-out-*`, `graph-in-*` (light, dark), written on every run for review.        |

The page contract the tests read: `#graph` carries `data-engine="stopped"`, `data-rendered-nodes` and
`data-drag`; the legend is a `navigation` named "Categories" with `aria-pressed` buttons; the panel is a
`region` named "Neighbours"; search is a `searchbox`. Frozen contract.
