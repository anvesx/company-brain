# script

Plain browser JavaScript, joined in this order into `/graph.js` by `../script.ts`. The files share one scope.

| File       | Holds                                                                           |
| ---------- | ------------------------------------------------------------------------------- |
| `state.js` | Group colours and sizes, `esc`, what is loaded, hidden or selected, `loadPage`. |
| `graph.js` | `ForceGraph3D` set-up, cluster force, bloom, rendered-node count.               |
| `panel.js` | Neighbour panel, category legend, title search.                                 |
| `main.js`  | Start-up and wiring.                                                            |
