# tests/integration

The routes over real HTTP: identity's own server (sign-up, OAuth, JWKS) and `mountGraphView` on one Hono
app on a free port, over a real graph-store file and a real SQLite auth file. Frozen contract.

| File             | Spec rule | What it pins                                                                             |
| ---------------- | --------- | ---------------------------------------------------------------------------------------- |
| `api.test.ts`    | 4         | `/v1/graph`: 401 + challenge, bad bearer, session and MCP bearer, `no-store`.            |
| `params.test.ts` | 3, 4      | Tenant isolation, query tenant/user ignored, limit and cursor, `asOf`, 400 on bad limit. |
| `page.test.ts`   | 4, 5      | `/graph`: 302 to `/sign-in`, HTML shell, no inline JS but the import map, `/graph.js`.   |
| `assets.test.ts` | 5         | `/3d-force-graph.js` and the `/vendor/three/*` allowlist byte-equal to node_modules.     |

The 300 ms timing test lives in `../scale`, so mutation testing can skip it.

`cursor/` holds the two-server tests for the shared cursor key (see its README).
