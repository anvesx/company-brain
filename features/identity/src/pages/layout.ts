/** Escape text before it goes into HTML, so a name like `<script>` shows as text and never runs. */
export const esc = (text: string): string => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const STYLE = `body{font:16px/1.5 system-ui,sans-serif;margin:0;background:#fafaf9;color:#1c1917}
main{max-width:40rem;margin:0 auto;padding:2rem 1rem}
h1{font-size:1.5rem}h2{font-size:1.125rem;margin-top:2rem}
label{display:block;margin:1rem 0}input{display:block;width:100%;padding:.5rem;margin-top:.25rem;box-sizing:border-box}
button{padding:.5rem 1rem;cursor:pointer}pre{background:#f5f5f4;padding:1rem;overflow:auto}
[role=alert]{color:#b91c1c}`;

/** The shared page shell. `script` is only ever the copy button; passkey pages load their script as files instead. */
export const page = (title: string, body: string, script = ""): string =>
  `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><style>${STYLE}</style></head>
<body><main><h1>${esc(title)}</h1>
${body}
</main>${script ? `<script>${script}</script>` : ""}</body></html>`;

/** A labelled text field. The label wraps the input, so clicking the label focuses it. */
export const field = (label: string, name: string, type: string, auto: string, value = ""): string =>
  `<label>${esc(label)}<input name="${name}" type="${type}" autocomplete="${auto}"${value ? ` value="${esc(value)}"` : ""} required></label>`;

/** Hidden inputs carried by every form: the CSRF token (when signed in) and the OAuth query being continued. */
export const hidden = (values: Record<string, string>): string =>
  Object.entries(values)
    .map(([name, value]) => `<input type="hidden" name="${name}" value="${esc(value)}">`)
    .join("");
