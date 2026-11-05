import { describe, expect, it } from "vitest";
import { INSTALL_CLIENTS, type InstallClient, renderInstall, TEMPLATES } from "../../../src/index.js";

const URL_ = "https://brain.example.com/mcp";
const render = (client: InstallClient, name = "company-brain", url = URL_) => renderInstall({ name, url }, client);

describe("install output", () => {
  it("rule 10: only claude-code has a command, with name and url in single quotes", () => {
    expect(render("claude-code").command).toBe(`claude mcp add --transport http 'company-brain' '${URL_}'`);
    for (const client of INSTALL_CLIENTS.filter((c) => c !== "claude-code")) expect(render(client).command, client).toBeNull();
  });

  it("rule 10: a single quote inside the url is closed, escaped and reopened", () => {
    // http://localhost/a'b needs no encoding in a path, so the quote reaches the shell text as-is.
    const { command } = render("claude-code", "x", "http://localhost/a'b");
    expect(command).toBe(`claude mcp add --transport http 'x' 'http://localhost/a'\\''b'`);
  });

  it("rule 10: claude-code has no notes; every other client flags its unconfirmed fields in order", () => {
    expect(render("claude-code").notes).toEqual([]);
    expect(render("codex").notes).toEqual(["url: check current docs"]);
    expect(render("gemini-cli").notes).toEqual(["httpUrl: check current docs"]);
    expect(render("claude-desktop").notes).toEqual(["command: check current docs", "args: check current docs"]);
  });

  it("rule 10: each template builds exactly its server entry", () => {
    expect(TEMPLATES["claude-code"].entry(URL_)).toEqual({ type: "http", url: URL_ });
    expect(TEMPLATES.codex.entry(URL_)).toEqual({ url: URL_ });
    expect(TEMPLATES.cursor.entry(URL_)).toEqual({ url: URL_ });
    expect(TEMPLATES["gemini-cli"].entry(URL_)).toEqual({ httpUrl: URL_ });
    expect(TEMPLATES["claude-desktop"].entry(URL_)).toEqual({ command: "npx", args: ["-y", "mcp-remote", URL_] });
  });

  it("rule 10: each template names its format and file", () => {
    expect(INSTALL_CLIENTS.map((c) => [c, TEMPLATES[c].format, TEMPLATES[c].path])).toEqual([
      ["claude-code", "json", ".mcp.json"],
      ["codex", "toml", "~/.codex/config.toml"],
      ["cursor", "json", "~/.cursor/mcp.json"],
      ["gemini-cli", "json", "~/.gemini/settings.json"],
      ["claude-desktop", "json", "~/Library/Application Support/Claude/claude_desktop_config.json"],
    ]);
  });

  it("rule 10: the TOML body is a table named after the server, one key per line", () => {
    expect(render("codex", "acme").body).toBe(`[mcp_servers.acme]\nurl = "${URL_}"\n`);
  });

  it("rule 10: the JSON body nests the entry under mcpServers with two-space indent and a newline", () => {
    expect(render("cursor", "acme").body).toBe(`{\n  "mcpServers": {\n    "acme": {\n      "url": "${URL_}"\n    }\n  }\n}\n`);
  });
});
