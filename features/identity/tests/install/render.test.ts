import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { INSTALL_CLIENTS, renderInstall } from "../../src/index.js";

const manifest = { name: "company-brain", url: "https://brain.example.com/mcp" };
const golden = (client: string): unknown => (JSON.parse(readFileSync(new URL("./golden.json", import.meta.url), "utf8")) as Record<string, unknown>)[client];

describe("install renderer", () => {
  it("rule 10: the five clients are the spec's, in order", () => {
    expect([...INSTALL_CLIENTS]).toEqual(["claude-code", "codex", "cursor", "gemini-cli", "claude-desktop"]);
  });

  it.each(["claude-code", "codex", "cursor", "gemini-cli", "claude-desktop"] as const)("rule 10: %s matches its golden file", (client) => {
    expect(renderInstall(manifest, client)).toEqual(golden(client));
  });

  it("rule 10: Claude Code renders a claude mcp add command as well as the file", () => {
    const out = renderInstall(manifest, "claude-code");
    expect(out.command).toBe("claude mcp add --transport http 'company-brain' 'https://brain.example.com/mcp'");
    expect(out.path).toBe(".mcp.json");
  });

  it("rule 10: only Claude Code has a command", () => {
    for (const client of INSTALL_CLIENTS.filter((c) => c !== "claude-code")) expect(renderInstall(manifest, client).command).toBeNull();
  });

  it("rule 10: every field the vendor docs did not confirm carries a check current docs note", () => {
    expect(renderInstall(manifest, "claude-code").notes).toEqual([]);
    for (const client of INSTALL_CLIENTS.filter((c) => c !== "claude-code")) {
      const notes = renderInstall(manifest, client).notes;
      expect(notes.length, client).toBeGreaterThan(0);
      for (const note of notes) expect(note).toMatch(/^\w+: check current docs$/);
    }
  });

  it("rule 10: no body carries a token or an Authorization header", () => {
    for (const client of INSTALL_CLIENTS) expect(renderInstall(manifest, client).body).not.toMatch(/authorization|bearer|token/i);
  });

  it("rule 10: the url is embedded verbatim, query and port included", () => {
    const url = "https://brain.example.com:8443/mcp?tenant=acme";
    for (const client of INSTALL_CLIENTS) expect(renderInstall({ name: "b", url }, client).body).toContain(url);
  });

  it("rule 10: a url with & and $(id) is quoted so a shell sees it as one literal argument", () => {
    const url = "https://brain.example.com/mcp?tenant=a&x=$(id)";
    const command = renderInstall({ name: "b", url }, "claude-code").command ?? "";
    // Expected by hand: the whole url sits inside one pair of single quotes, so & and $( are not special.
    expect(command).toBe(`claude mcp add --transport http 'b' '${url}'`);
    // Replace the leading "claude mcp add" by printf '%s\n' and let a real shell split the rest into arguments.
    const printed = execFileSync("sh", ["-c", command.replace("claude mcp add", "printf '%s\\n'")], { encoding: "utf8" });
    expect(printed).toBe(`--transport\nhttp\nb\n${url}\n`);
  });

  it("rule 10: a single quote inside the url is escaped as '\\'' and survives the shell", () => {
    const url = "https://brain.example.com/mcp?q=it's";
    const command = renderInstall({ name: "b", url }, "claude-code").command ?? "";
    expect(command).toContain(`'https://brain.example.com/mcp?q=it'\\''s'`);
    const printed = execFileSync("sh", ["-c", command.replace("claude mcp add", "printf '%s\\n'")], { encoding: "utf8" });
    expect(printed.endsWith(`${url}\n`)).toBe(true);
  });
});
