import { describe, expect, it } from "vitest";
import { IdentityError, type InstallClient, InstallRenderError, renderInstall, TEMPLATES } from "../../src/index.js";

const url = "https://brain.example.com/mcp";

const badField = (manifest: { name: string; url: string }, client: string = "claude-code"): unknown => {
  try {
    renderInstall(manifest, client as InstallClient);
  } catch (error) {
    return { code: (error as { code?: unknown }).code, field: (error as { field?: unknown }).field };
  }
  return "rendered";
};

describe("install manifest checks", () => {
  it.each([
    ["an underscore", "company_brain"],
    ["64 characters", "b".repeat(64)],
    ["nothing", ""],
    ["a space", "company brain"],
    ["a dot", "company.brain"],
  ])("rule 13: a name with %s is BAD_INPUT naming name", (_why, name) => {
    expect(badField({ name, url })).toEqual({ code: "BAD_INPUT", field: "name" });
  });

  it("rule 10: a name of exactly 63 letters, digits and hyphens renders", () => {
    expect(badField({ name: `a-1${"b".repeat(60)}`, url })).toBe("rendered");
  });

  it.each([
    ["http", "http://brain.example.com/mcp"],
    ["relative", "/mcp"],
    ["not a url", "brain"],
    ["credentials in it", "https://user:pass@brain.example.com/mcp"],
    ["another scheme", "ftp://brain.example.com/mcp"],
  ])("rule 13: a url that is %s is BAD_INPUT naming url", (_why, bad) => {
    expect(badField({ name: "company-brain", url: bad })).toEqual({ code: "BAD_INPUT", field: "url" });
  });

  it("rule 13: an unknown client is BAD_INPUT naming client", () => {
    expect(badField({ name: "company-brain", url }, "vscode")).toEqual({ code: "BAD_INPUT", field: "client" });
  });

  it.each(["http://localhost:8788/mcp", "http://127.0.0.1/mcp", "http://[::1]:3000/mcp"])("rule 13: http on loopback (%s) renders", (loopback) => {
    expect(badField({ name: "company-brain", url: loopback })).toBe("rendered");
  });

  it("rule 13: http on a host that only looks local is still BAD_INPUT", () => {
    expect(badField({ name: "company-brain", url: "http://localhost.evil.com/mcp" })).toEqual({ code: "BAD_INPUT", field: "url" });
  });

  it("rule 10: a template that emits a broken file throws InstallRenderError naming the client", () => {
    // The "bad key" entry makes TOML like `bad key = "x"`, which is invalid, so the parse-back must fail.
    const broken = { ...TEMPLATES, codex: { ...TEMPLATES.codex, entry: () => ({ "bad key": "x" }) } };
    const run = (): unknown => renderInstall({ name: "company-brain", url }, "codex", broken);
    expect(run).toThrow(InstallRenderError);
    expect(run).toThrow(/codex/);
    expect(
      (() => {
        try {
          run();
        } catch (error) {
          return (error as InstallRenderError).client;
        }
        return "";
      })(),
    ).toBe("codex");
    expect(new InstallRenderError("codex", "x")).not.toBeInstanceOf(IdentityError);
  });
});
