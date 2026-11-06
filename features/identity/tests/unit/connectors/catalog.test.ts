import { describe, expect, it } from "vitest";
import { catalogTiles, type ProviderEntry, providerSecrets } from "../../../src/index.js";

const entry = (id: string, kind: ProviderEntry["kind"] = "built-in"): ProviderEntry => ({
  id,
  name: id,
  description: `${id} tile`,
  scopes: ["read"],
  kind,
});

describe("connector catalog (connector-accounts rule 11)", () => {
  it("rule 11: client id and secret come from <ID>_CLIENT_ID and <ID>_CLIENT_SECRET, upper-cased", () => {
    const env = { GITHUB_CLIENT_ID: "gh-id", GITHUB_CLIENT_SECRET: "gh-secret" };
    expect(providerSecrets("github", env)).toEqual({ clientId: "gh-id", clientSecret: "gh-secret" });
  });

  it("rule 11: characters other than letters and digits become underscores in the env name", () => {
    const env = { MY_TOOL_CLIENT_ID: "id", MY_TOOL_CLIENT_SECRET: "secret" };
    expect(providerSecrets("my-tool", env)).toEqual({ clientId: "id", clientSecret: "secret" });
  });

  it("rule 11: a missing or empty id or secret means not configured", () => {
    expect(providerSecrets("github", { GITHUB_CLIENT_ID: "gh-id" })).toBeNull();
    expect(providerSecrets("github", { GITHUB_CLIENT_SECRET: "s" })).toBeNull();
    expect(providerSecrets("github", { GITHUB_CLIENT_ID: "", GITHUB_CLIENT_SECRET: "s" })).toBeNull();
    expect(providerSecrets("github", {})).toBeNull();
  });

  it("rule 11: tiles keep catalog order and say which providers are configured; no secret is on a tile", () => {
    const env = { SLACK_CLIENT_ID: "sl-id", SLACK_CLIENT_SECRET: "sl-secret" };
    const tiles = catalogTiles([entry("github"), entry("slack"), entry("notes", "generic")], env);
    expect(tiles.map((t) => [t.id, t.configured])).toEqual([
      ["github", false],
      ["slack", true],
      ["notes", false],
    ]);
    expect(JSON.stringify(tiles)).not.toContain("sl-secret");
    expect(JSON.stringify(tiles)).not.toContain("sl-id");
  });
});
