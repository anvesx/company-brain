# routes

`mountGraphView(app, { store, port, aliases? })` adds the graph view to a Hono app.

| File        | Holds                                                                                  |
| ----------- | -------------------------------------------------------------------------------------- |
| `mount.ts`  | `/graph` (session or redirect to `/sign-in`) `/graph.css`, `/graph.js`, CSP.           |
| `api.ts`    | `GET /v1/graph`: caller from the identity port, `no-store`, 400 on bad input.          |
| `assets.ts` | `/3d-force-graph.js` and the six allowlisted `/vendor/three/...` files, byte for byte. |
