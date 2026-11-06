# page

The graph page: the HTML shell, its styles and the browser script.

| Path        | Holds                                                                                                                |
| ----------- | -------------------------------------------------------------------------------------------------------------------- |
| `view.ts`   | The HTML shell with the import map (the only inline `<script>`) and its CSP hash.                                    |
| `style.ts`  | Served at `/graph.css`: CSS from `docs/design` tokens: black canvas, legend and panel follow `prefers-color-scheme`. |
| `script.ts` | Joins the files of `script/` into the one classic script served at `/graph.js`.                                      |
| `script/`   | Plain browser JavaScript: colours, state, the 3D graph, panel and legend, start-up.                                  |
