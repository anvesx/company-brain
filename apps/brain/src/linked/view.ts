import type { Row } from "./sources.js";

const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** A small page: the title, then the rows (or the reason there are none), then a way back. */
export const dataPage = (name: string, title: string, body: { rows: Row[] } | { error: string }): string => {
  const inner =
    "error" in body
      ? `<p role="alert">${esc(body.error)}</p>`
      : body.rows.length
        ? `<ul>${body.rows.map((r) => `<li><strong>${esc(r.name)}</strong> ${esc(r.detail)}</li>`).join("")}</ul>`
        : "<p>Nothing to show yet.</p>";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(name)}</title></head>
<body><main style="max-width:40rem;margin:2rem auto;padding:0 1rem;font:16px/1.5 system-ui"><h1>${esc(name)}</h1><h2>${esc(title)}</h2>${inner}<p><a href="/connections">Back to connections</a></p></main></body></html>`;
};
