// biome-ignore-all lint/correctness/noUnusedVariables: the script files are joined into one scope (../script.ts)
// The 3D graph (3d-force-graph) and everything that changes what it draws.
const shown = (n) => n !== undefined && !state.hidden.has(n.group);
const endOf = (end) => byId.get(typeof end === "object" ? end.id : end);
const touchesSelected = (l) => state.selected !== null && (l.from === state.selected.id || l.to === state.selected.id);
const linkShown = (l) => shown(endOf(l.source)) && shown(endOf(l.target));
const linkColor = (l) => (touchesSelected(l) ? "#6BA3FF" : "rgba(255,255,255,.14)");
const Graph = ForceGraph3D()(pick("graph"))
  .backgroundColor("#000000")
  .nodeRelSize(1)
  .nodeVal((n) => radiusOf(n.group) ** 3)
  .nodeColor((n) => colorOf(n.group))
  .nodeLabel((n) => `${esc(n.title)} <i>${esc(n.group)}</i>`)
  .nodeVisibility(shown)
  .linkVisibility(linkShown)
  .linkColor(linkColor)
  .enablePointerInteraction(true)
  .nodeResolution(4)
  .warmupTicks(calm ? 260 : 150) // settle the layout before frame 1: frames are slow with thousands of nodes
  .cooldownTicks(0)
  .onNodeClick((n) => select(n))
  .onNodeHover((n) => pick("graph").style.setProperty("cursor", n ? "pointer" : "auto"))
  .onEngineStop(() => {
    pick("graph").dataset.engine = "stopped";
    countRendered();
    wake();
  });

// Pulls every node toward the middle of its group, so each category forms a cluster.
Graph.d3Force("cluster", (alpha) => {
  const mid = {};
  for (const n of state.nodes) {
    mid[n.group] ??= { x: 0, y: 0, z: 0, n: 0 };
    const m = mid[n.group];
    m.x += n.x ?? 0;
    m.y += n.y ?? 0;
    m.z += n.z ?? 0;
    m.n += 1;
  }
  for (const n of state.nodes) {
    const m = mid[n.group];
    for (const a of ["x", "y", "z"]) n[`v${a}`] += (m[a] / m.n - (n[a] ?? 0)) * alpha * 0.1;
  }
});

// Bloom: three's own ES modules, loaded through the import map. A failure leaves a plain graph, and says so.
async function addBloom() {
  try {
    const { UnrealBloomPass } = await import("/vendor/three/examples/jsm/postprocessing/UnrealBloomPass.js");
    const { Vector2 } = await import("three");
    Graph.postProcessingComposer().addPass(new UnrealBloomPass(new Vector2(256, 256), 0.25, 0.4, 0.4));
    pick("graph").dataset.bloom = "on";
  } catch (error) {
    pick("graph").dataset.bloom = "off";
    console.warn("bloom is off:", error);
  }
}

// Redraws after a legend toggle or a selection. Visibility is applied on the next frame, so the count waits a moment.
function refresh() {
  Graph.nodeVisibility(shown).linkVisibility(linkShown).linkColor(linkColor);
  for (const ms of [150, 700, 2000, 4000]) setTimeout(countRendered, ms); // a frame may be slow: count again
  wake();
}

// Click or search: remember the node, fly the camera to it and open the panel.
function select(n) {
  state.selected = n;
  const reach = 1 + 80 / Math.hypot(n.x ?? 1, n.y ?? 1, n.z ?? 1);
  Graph.cameraPosition({ x: (n.x ?? 0) * reach, y: (n.y ?? 0) * reach, z: (n.z ?? 0) * reach }, n, calm ? 0 : 1000);
  openPanel(n);
  refresh();
}
