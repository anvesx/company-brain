import { createHash } from "node:crypto";

// The one inline script is data, not code: it tells the browser where to find `three` for the bloom pass.
const IMPORT_MAP = JSON.stringify({ imports: { three: "/vendor/three/build/three.module.js" } }, null, 1);
/** The CSP source for exactly this import map: a browser blocks an inline import map unless script-src names its hash. */
export const IMPORT_MAP_HASH = `'sha256-${createHash("sha256").update(IMPORT_MAP).digest("base64")}'`;

/**
 * The page shell (docs/design/pages.md, "Graph"). It holds the markup the script fills in and no logic: the
 * library and the page script load as files, so the page needs no inline JavaScript.
 */
export const graphPage = (): string => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><title>Graph</title><link rel="stylesheet" href="/graph.css">
<script type="importmap">${IMPORT_MAP}</script></head>
<body class="graph"><a class="skip" href="#graph">Skip to graph</a>
<header><a href="/connections">Connections</a>
<div class="search"><label class="sr" for="search">Search titles</label><input id="search" type="search" placeholder="Search titles" autocomplete="off"><ul id="results"></ul></div></header>
<main><div id="graph" role="img" aria-label="Graph"></div>
<nav aria-label="Categories"><h2>Groups</h2><ul id="legend"></ul></nav>
<section id="panel" aria-label="Neighbours" hidden><button id="close" type="button">Close</button><h2 id="panel-title" tabindex="-1"></h2><p id="panel-meta" class="eyebrow"></p><p id="panel-count"></p><ul id="panel-list"></ul></section>
<p id="status" role="status">Loading graph</p><button id="more" type="button" hidden>Load more</button></main>
<script src="/3d-force-graph.js"></script><script src="/graph.js"></script></body></html>
`;
