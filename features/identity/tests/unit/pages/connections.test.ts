import { describe, expect, it } from "vitest";
import { INSTALL_CLIENTS, TEMPLATES } from "../../../src/install/render.js";
import { connectionsView } from "../../../src/pages/views/connections.js";
import { COPY_SCRIPT, guide } from "../../../src/pages/views/guide.js";

const base = { organization: "Acme & Co", csrf: "tok", resource: "https://brain.example.com/mcp", serverName: "brain", templates: TEMPLATES };
const tiles = [
  { name: "Slack", description: "Channels <all>" },
  { name: "Notion", description: "Pages" },
];

describe("connections page", () => {
  it("rule 9: shows the organization, account and switch links, a sign-out form and the one copy script", () => {
    const html = connectionsView({ ...base, catalog: [], connections: [] });
    expect(html).toContain("<title>Connections</title>");
    expect(html).toContain('<p>Organization: <strong>Acme &#38; Co</strong> <a href="/picker">Switch</a> <a href="/account">Account</a></p>');
    expect(html).toContain(
      '<form method="post" action="/sign-out"><input type="hidden" name="csrf" value="tok"><button type="submit">Sign out</button></form>',
    );
    expect(html).toContain(`</main><script>${COPY_SCRIPT}</script>`);
  });

  it("rule 9: with connections it lists them first and shows no catalog", () => {
    const html = connectionsView({ ...base, catalog: tiles, connections: [{ name: "Slack <ws>", detail: "3 channels" }] });
    expect(html).toContain('<section aria-label="Connections"><h2>Connections</h2><ul><li><strong>Slack &#60;ws&#62;</strong> 3 channels</li></ul></section>');
    expect(html).not.toContain("Catalog");
  });

  it("rule 9: with zero connections it shows the catalog tiles before the install guide", () => {
    const html = connectionsView({ ...base, catalog: tiles, connections: [] });
    expect(html).toContain(
      '<section aria-label="Catalog"><h2>Catalog</h2><ul><li><strong>Slack</strong> Channels &#60;all&#62;</li><li><strong>Notion</strong> Pages</li></ul></section>\n<section aria-label="Install guide">',
    );
    expect(html).not.toContain('aria-label="Connections"');
  });

  it("rule 9: with neither it says no connectors are available yet", () => {
    expect(connectionsView({ ...base, catalog: [], connections: [] })).toContain(
      '<section aria-label="Catalog"><h2>Catalog</h2><p>No connectors are available yet.</p></section>',
    );
  });
});

describe("install guide", () => {
  const html = guide("https://brain.example.com/mcp");

  it("rule 10: Claude Code comes first, with its file, its JSON under the default name and its quoted command", () => {
    expect(html.indexOf("<h3>claude-code</h3>")).toBeLessThan(html.indexOf("<h3>codex</h3>"));
    expect(html).toContain("<p>File: <code>.mcp.json</code></p>");
    expect(html).toContain('<pre id="cfg-claude-code">{\n  &#34;mcpServers&#34;: {\n    &#34;company-brain&#34;: {');
    expect(html).toContain(
      '<pre id="cmd-claude-code">claude mcp add --transport http &#39;company-brain&#39; &#39;https://brain.example.com/mcp&#39;</pre>\n<h3>codex</h3>',
    );
    expect(html.match(/id="cmd-/g)).toHaveLength(1);
  });

  it("rule 10: every client gets a Copy button wired to its block", () => {
    expect(html).toContain('<button type="button" data-copy="cfg-codex">Copy</button>\n<p><small>url: check current docs</small></p>');
    expect(html.match(/data-copy="cfg-/g)).toHaveLength(INSTALL_CLIENTS.length);
  });

  it("rule 10: unconfirmed fields carry 'check current docs', side by side; confirmed ones carry none", () => {
    expect(html).toContain("<p><small>command: check current docs</small></p><p><small>args: check current docs</small></p>");
    expect(html).toContain("<h2>Install in your MCP client</h2>\n<h3>claude-code</h3>");
    expect(html.match(/check current docs/g)).toHaveLength(INSTALL_CLIENTS.reduce((n, c) => n + TEMPLATES[c].unconfirmed.length, 0));
  });

  it("rule 10: the server name given by config names the entry", () => {
    expect(guide("https://brain.example.com/mcp", "acme")).toContain("&#34;acme&#34;: {");
  });
});
