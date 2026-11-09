import { describe, expect, it } from "vitest";
import { INSTALL_CLIENTS, renderInstall, TEMPLATES } from "../../../src/index.js";

// mcp-server rule 10: Kiro and Antigravity install templates. Neither vendor's field names are confirmed
// by docs we can cite, so every field is flagged "check current docs". Kiro's path and key match what
// `kiro-cli mcp add --scope workspace` writes; Antigravity's match what `agy mcp add --type http` writes.
const URL_ = "https://brain.example.com/mcp";
const tree = (body: string) => JSON.parse(body) as { mcpServers: Record<string, Record<string, unknown>> };

describe("agent install templates", () => {
  it("adds kiro and antigravity after the original five, claude-code still first", () => {
    expect(INSTALL_CLIENTS[0]).toBe("claude-code");
    expect(INSTALL_CLIENTS.slice(-2)).toEqual(["kiro", "antigravity"]);
    expect(INSTALL_CLIENTS).toHaveLength(7);
  });

  it("kiro: workspace .kiro/settings/mcp.json with a url entry", () => {
    const out = renderInstall({ name: "company-brain", url: URL_ }, "kiro");
    expect([out.format, out.path, out.command]).toEqual(["json", ".kiro/settings/mcp.json", null]);
    expect(tree(out.body).mcpServers).toEqual({ "company-brain": { url: URL_ } });
  });

  it("antigravity: global ~/.gemini/config/mcp_config.json with a serverUrl entry", () => {
    const out = renderInstall({ name: "company-brain", url: URL_ }, "antigravity");
    expect([out.format, out.path, out.command]).toEqual(["json", "~/.gemini/config/mcp_config.json", null]);
    expect(tree(out.body).mcpServers).toEqual({ "company-brain": { serverUrl: URL_ } });
  });

  it("flags every field of both entries as unconfirmed, in entry order", () => {
    for (const client of ["kiro", "antigravity"] as const) {
      const fields = Object.keys(TEMPLATES[client].entry(URL_));
      expect([...TEMPLATES[client].unconfirmed], client).toEqual(fields);
      expect(renderInstall({ name: "b", url: URL_ }, client).notes, client).toEqual(fields.map((f) => `${f}: check current docs`));
    }
  });

  it("puts no credential in either body", () => {
    for (const client of ["kiro", "antigravity"] as const) {
      expect(renderInstall({ name: "b", url: URL_ }, client).body).not.toMatch(/authorization|bearer|token|headers/i);
    }
  });

  it("parses back a url that needs JSON escaping", () => {
    const url = 'https://brain.example.com/mcp?q="x"&r=\\y';
    for (const client of ["kiro", "antigravity"] as const) {
      expect(Object.values(tree(renderInstall({ name: "b", url }, client).body).mcpServers["b"] ?? {})).toEqual([url]);
    }
  });
});
