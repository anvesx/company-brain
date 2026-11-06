import { parse as parseToml } from "smol-toml";
import { describe, expect, it } from "vitest";
import { INSTALL_CLIENTS, renderInstall } from "../../src/index.js";

const manifest = { name: "company-brain", url: "https://brain.example.com/mcp" };

const parseBack = (format: string, body: string): Record<string, unknown> =>
  (format === "toml" ? parseToml(body) : JSON.parse(body)) as Record<string, unknown>;

describe("install parse-back", () => {
  it.each([...["claude-code", "codex", "cursor", "gemini-cli", "claude-desktop"]])("rule 10: the %s body parses back in its format", (client) => {
    const out = renderInstall(manifest, client as (typeof INSTALL_CLIENTS)[number]);
    expect(["json", "toml"]).toContain(out.format);
    expect(() => parseBack(out.format, out.body)).not.toThrow();
  });

  it("rule 10: every parsed body holds one server under the manifest name, pointing at the url", () => {
    for (const client of INSTALL_CLIENTS) {
      const out = renderInstall(manifest, client);
      const tree = parseBack(out.format, out.body);
      const servers = (tree["mcpServers"] ?? tree["mcp_servers"]) as Record<string, unknown>;
      expect(Object.keys(servers), client).toEqual(["company-brain"]);
      expect(JSON.stringify(servers["company-brain"]), client).toContain(manifest.url);
    }
  });

  it("rule 10: a url with characters JSON and TOML must escape still parses back to itself", () => {
    const url = 'https://brain.example.com/mcp?q="x"&r=\\y';
    for (const client of INSTALL_CLIENTS) {
      const out = renderInstall({ name: "b", url }, client);
      expect(JSON.stringify(parseBack(out.format, out.body)), client).toContain(JSON.stringify(url).slice(1, -1));
    }
  });
});
