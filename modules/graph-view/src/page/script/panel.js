// biome-ignore-all lint/correctness/noUnusedVariables: the script files are joined into one scope (../script.ts)
// The side panel (neighbours of the selected node), the legend and search.
let opener = null; // what had focus before the panel opened, so Escape can give it back

function openPanel(n) {
  opener = pick("results").contains(document.activeElement) ? pick("search") : document.activeElement; // the list's buttons are about to go
  pick("results").replaceChildren(); // a pick (click or Enter) closes the search list, which would otherwise cover the panel title
  const ids = [...new Set(around.get(n.id) ?? [])];
  pick("panel-title").textContent = n.title;
  pick("panel-meta").textContent = `${n.kind} · ${n.source}`;
  pick("panel-count").textContent = `Connected to ${ids.length} nodes`;
  pick("panel-list").replaceChildren(...ids.slice(0, 200).map((id) => nodeButton(byId.get(id))));
  pick("panel").hidden = false;
  pick("panel-title").focus();
}

function closePanel() {
  pick("panel").hidden = true;
  state.selected = null;
  refresh();
  opener?.focus();
}

// One list item holding a button that selects the node.
function nodeButton(n) {
  const li = document.createElement("li");
  const button = Object.assign(document.createElement("button"), { type: "button", textContent: n.title });
  button.addEventListener("click", () => select(n));
  li.append(button);
  return li;
}

// The legend: swatch, group and count per category; pressing one hides or shows that group.
function buildLegend(categories) {
  pick("legend").replaceChildren(
    ...categories.map(({ group, count }) => {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("aria-pressed", "true");
      button.innerHTML = `<span class="swatch"></span>${esc(group)} <b>${count}</b>`;
      button.firstChild.style.background = colorOf(group); // set through the style object: the page's CSP has no inline styles
      button.addEventListener("click", () => {
        const on = state.hidden.delete(group) || !state.hidden.add(group);
        button.setAttribute("aria-pressed", String(on));
        refresh();
      });
      li.append(button);
      return li;
    }),
  );
}

// Search over titles: matches fill a list of buttons; Enter picks the first one.
function search(query) {
  const q = query.trim().toLowerCase();
  const hits = q === "" ? [] : state.nodes.filter((n) => n.title.toLowerCase().includes(q));
  pick("results").replaceChildren(...hits.slice(0, 20).map(nodeButton));
  pick("status").textContent = q !== "" && hits.length === 0 ? `No titles match ${query.trim()}.` : "";
  return hits[0];
}
