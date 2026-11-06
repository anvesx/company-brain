import { describe, expect, it } from "vitest";
import { IdentityError, type InstallClient, InstallRenderError, renderInstall, TEMPLATES } from "../../../src/index.js";

const GOOD = { name: "company-brain", url: "https://brain.example.com/mcp" };
const caught = (run: () => unknown): IdentityError => {
  try {
    run();
  } catch (error) {
    if (error instanceof IdentityError) return error;
    throw error;
  }
  throw new Error("expected an IdentityError");
};

describe("install input errors, exact text", () => {
  it("rule 13: a bad name says which characters are allowed, prefixed by the field", () => {
    const error = caught(() => renderInstall({ ...GOOD, name: "no_good" }, "codex"));
    expect([error.code, error.field, error.message]).toEqual(["BAD_INPUT", "name", "name: use 1 to 63 letters, digits or hyphens"]);
  });

  it("rule 13: a bad url says https, http only on localhost, no credentials", () => {
    const error = caught(() => renderInstall({ ...GOOD, url: "http://example.com/mcp" }, "codex"));
    expect([error.code, error.field, error.message]).toEqual(["BAD_INPUT", "url", "url: must be https (http only on localhost) without credentials"]);
  });

  it("rule 13: an unknown client names itself", () => {
    const error = caught(() => renderInstall(GOOD, "vscode" as InstallClient));
    expect([error.field, error.message]).toEqual(["client", "client: unknown client vscode"]);
  });

  it("rule 13: a client name that only exists on Object.prototype is unknown, not a template", () => {
    expect(caught(() => renderInstall(GOOD, "constructor" as InstallClient)).field).toBe("client");
  });

  it("rule 13: a user alone, a password alone, or both in the url is refused", () => {
    for (const url of ["https://u@brain.example.com/mcp", "https://:p@brain.example.com/mcp", "https://u:p@brain.example.com/mcp"]) {
      expect(caught(() => renderInstall({ ...GOOD, url }, "cursor")).field, url).toBe("url");
    }
  });

  it("rule 14: a template whose file does not parse back is an InstallRenderError naming the client", () => {
    const broken = { ...TEMPLATES, codex: { ...TEMPLATES.codex, entry: () => ({ "bad key": "x" }) } };
    let error: unknown;
    try {
      renderInstall(GOOD, "codex", broken);
    } catch (thrown) {
      error = thrown;
    }
    expect(error).toBeInstanceOf(InstallRenderError);
    expect([(error as InstallRenderError).name, (error as InstallRenderError).client]).toEqual(["InstallRenderError", "codex"]);
    expect((error as Error).message).toMatch(/^the codex install file is not valid: ./);
  });
});
