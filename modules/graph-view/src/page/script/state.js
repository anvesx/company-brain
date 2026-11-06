// biome-ignore-all lint/correctness/noUnusedVariables: the script files are joined into one scope (../script.ts)
// Colours, sizes and text escaping. The four connectors differ in hue (blue, lime, red, purple), not just in lightness. The palette is defined here, chosen for distinguishable hues (notion #A3E635, slack #FF6B81, github #B388FF, gdrive #5B9BFF; 7:1 or better on black). docs/design/system.md on main still lists the older values (notion #A9BEFF, slack #8A8CFF, github #C2A8FF, group `document:drive`) and must be updated to match this file, including the group id `document:gdrive`.
const COLORS = {
  person: "#F5F5F5",
  team: "#F0E442",
  project: "#56D0F0",
  repo: "#2BD4A0",
  channel: "#F08CC8",
  ticket: "#FF7A33",
  "document:gdrive": "#5B9BFF",
  "document:notion": "#A3E635",
  "document:slack": "#FF6B81",
  "document:github": "#B388FF",
};
// A group with no colour of its own takes the next of these, then they repeat.
const SPARE = ["#8FA0B8", "#7FB3C8", "#B5A99A"];
const spareFor = new Map();
const colorOf = (group) => {
  if (COLORS[group]) return COLORS[group];
  if (!spareFor.has(group)) spareFor.set(group, SPARE[spareFor.size % SPARE.length]);
  return spareFor.get(group);
};
// Node radius in world units: teams and projects largest, documents smallest.
const RADIUS = { person: 4, team: 7, project: 7, repo: 5, channel: 4, ticket: 4 };
const radiusOf = (group) => RADIUS[group] ?? 3;
// Titles come from connectors, so they are escaped before they go into hover labels or the page.
const esc = (text) => String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const pick = (id) => document.getElementById(id);
// What has been loaded, and what the person has switched off or selected.
const state = { nodes: [], links: [], hidden: new Set(), selected: null, total: 0, next: undefined };
const byId = new Map(); // node id -> node
const around = new Map(); // node id -> ids of the nodes it shares an edge with
const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Fetches one page of /v1/graph and adds it to the state. The server sends each edge once, after both its ends.
async function loadPage() {
  const res = await fetch(`/v1/graph${state.next ? `?cursor=${encodeURIComponent(state.next)}` : ""}`, { credentials: "same-origin" });
  if (res.status === 401) throw Object.assign(new Error("signed out"), { signedOut: true });
  if (!res.ok) throw new Error(`/v1/graph answered ${res.status}`);
  const page = await res.json();
  for (const n of page.nodes) {
    byId.set(n.id, n);
    around.set(n.id, []);
    state.nodes.push(n);
  }
  for (const e of page.edges) {
    state.links.push({ source: e.from, target: e.to, from: e.from, to: e.to, kind: e.kind });
    around.get(e.from).push(e.to);
    around.get(e.to).push(e.from);
  }
  state.total = page.categories.reduce((sum, c) => sum + c.count, 0);
  state.next = page.next;
  return page;
}
