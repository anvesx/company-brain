/** Build an element: `h("a", {href: "#/"}, "text", child)`. `on*` attributes become listeners; false and null are skipped. */
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, "");
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  el.append(...kids.flat().filter((k) => k != null && k !== false));
  return el;
}

export const mount = (root, ...nodes) => root.replaceChildren(...nodes.filter((n) => n != null && n !== false));

/** A labelled form control with an optional hint underneath. */
export const field = (label, id, control, hint) => h("div", { class: "field" }, h("label", { for: id }, label), control, hint);

/** A select whose options are `[value, text]` pairs. */
export const select = (id, options, value) =>
  h(
    "select",
    { id },
    options.map(([v, t]) => h("option", { value: v, selected: v === value }, t)),
  );
