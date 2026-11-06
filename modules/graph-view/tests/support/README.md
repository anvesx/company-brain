# tests/support

Shared helpers for the graph-view suites. Every helper drives real code: a real SQLite graph store on
disk and a real identity server. Nothing here imitates either.

| File        | What it gives a test                                                                                                                    |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `store.ts`  | `openStore()` (temp-file store, removed after each test), `node`, `edge`, `write`, `edgeKeys`.                                          |
| `world.ts`  | `seedWorld()`: a small company in tenant `t1` with the hand-worked visible sets for alice and bob.                                      |
| `seed.ts`   | `seedScale()`: 10,000 readable documents and 50,000 edges from a seeded PRNG, visible set by design.                                    |
| `server.ts` | `boot(store)`: identity plus `mountGraphView` on a free port; `another` is a second server on the same store and identity.              |
| `net/`      | `tuned(server)`: the production keep-alive limit (`keepAliveTimeout` 620 s) on a test server, so a pooled socket is never closed under the client. |

`server.ts` reuses identity's own test client (`Browser`, `signUp`) and OAuth flow (`connect`, `bearer`)
by relative import, so the graph view is tested against the same sign-in path real users take.
