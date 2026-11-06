import { INSTALL_CLIENTS, type InstallTemplate, renderInstall, TEMPLATES } from "../../install/render.js";
import { esc } from "../layout.js";

/** The only script in the connections page: copy a block's text to the clipboard. */
export const COPY_SCRIPT = `document.addEventListener("click",function(e){var b=e.target.closest("[data-copy]");if(b)navigator.clipboard.writeText(document.getElementById(b.dataset.copy).textContent)})`;

/** Claude Code first, because its block is the one people copy most. */
const ordered = [...INSTALL_CLIENTS].sort((a, b) => Number(b === "claude-code") - Number(a === "claude-code"));

/** The install guide: for each client the file to edit, its exact contents, and any field still to confirm in the client's docs. */
export const guide = (
  url: string,
  name = "company-brain",
  templates: Readonly<Record<(typeof INSTALL_CLIENTS)[number], InstallTemplate>> = TEMPLATES,
): string => {
  const blocks = ordered.map((client) => {
    const out = renderInstall({ name, url }, client, templates);
    const command = out.command ? `<pre id="cmd-${client}">${esc(out.command)}</pre>` : "";
    return `<h3>${esc(client)}</h3>
<p>File: <code>${esc(out.path)}</code></p>
<pre id="cfg-${client}">${esc(out.body)}</pre>
<button type="button" data-copy="cfg-${client}">Copy</button>
${command}${out.notes.map((note) => `<p><small>${esc(note)}</small></p>`).join("")}`;
  });
  return `<section aria-label="Install guide"><h2>Install in your MCP client</h2>\n${blocks.join("\n")}</section>`;
};
