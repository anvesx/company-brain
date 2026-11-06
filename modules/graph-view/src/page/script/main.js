// Start-up: load the first page, draw it, wire the controls.
const setStatus = (text) => (pick("status").textContent = text);

// Frames are idle-paused: three.js redraws only for a moment after a click, drag, wheel or key (keeps the page responsive).
let idle = 0;
function wake() {
  Graph.resumeAnimation();
  clearTimeout(idle);
  idle = setTimeout(() => Graph.pauseAnimation(), 2500);
}
for (const type of ["pointerdown", "pointermove", "wheel", "keydown"]) pick("graph").addEventListener(type, wake, { passive: true });

// Counts the node objects that are drawn: visible objects in the scene that three-forcegraph tagged as nodes.
function countRendered() {
  let count = 0;
  Graph.scene().traverse((o) => {
    if (o.__graphObjType === "node" && o.visible) count += 1;
  });
  pick("graph").dataset.renderedNodes = String(count);
}

// The canvas takes the size of #graph (the page minus the header), not the window's, and follows window resizes.
function fit() {
  const { width, height } = pick("graph").getBoundingClientRect();
  Graph.width(width).height(height);
}
addEventListener("resize", () => {
  fit();
  wake();
});

// A 401 from /v1/graph means the session ended: go and sign in again. Anything else is a failed load.
function failed(error) {
  if (error.signedOut) return location.assign("/sign-in");
  console.error(error);
  setStatus("The graph did not load. Reload the page.");
}

function draw(categories) {
  Graph.graphData({ nodes: state.nodes, links: state.links });
  Graph.enableNodeDrag(state.nodes.length <= 2000); // dragging thousands of nodes is too slow (rule 5)
  pick("graph").dataset.drag = state.nodes.length <= 2000 ? "on" : "off";
  pick("graph").setAttribute("aria-label", `Graph of ${state.nodes.length} nodes`);
  pick("more").hidden = state.next === undefined;
  setStatus(state.next === undefined ? "" : `Showing ${state.nodes.length} of ${state.total} nodes.`);
  buildLegend(categories);
}

async function start() {
  try {
    fit();
    const page = await loadPage();
    if (page.nodes.length === 0) return setStatus("Nothing to show yet. Connect a source on the connections page.");
    draw(page.categories);
    countRendered();
    await addBloom();
    pick("more").addEventListener("click", () => loadPage().then((p) => draw(p.categories), failed));
    pick("close").addEventListener("click", closePanel);
    pick("search").addEventListener("input", (e) => search(e.target.value));
    pick("search").addEventListener("keydown", (e) => {
      const hit = e.key === "Enter" ? search(e.target.value) : undefined;
      if (hit) select(hit);
    });
    document.addEventListener("keydown", (e) => e.key === "Escape" && !pick("panel").hidden && closePanel());
  } catch (error) {
    failed(error);
  }
}
start();
