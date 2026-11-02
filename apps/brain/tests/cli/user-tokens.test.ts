import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFolderConnector } from "@brain/connector-kit";
import { afterAll, describe, expect, it } from "vitest";
import { userTokensFor } from "../../src/cli/user-tokens.js";
import { defaultGrants, guarded } from "../live/support.js";

const dir = mkdtempSync(join(tmpdir(), "brain-utok-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));
const file = join(dir, "tokens.json");
writeFileSync(file, JSON.stringify({ "acme:alice": "alice-pat" }));
const principal = (id: string, tenantId = "acme") => ({ id, tenantId, groups: [] });

describe("userTokensFor", () => {
  it("returns undefined when no tokens file is configured and the connector does not enforce user tokens", () => {
    expect(userTokensFor(createFolderConnector("folder", dir), undefined)).toBeUndefined();
  });
  it("maps tenant:user to the user's own credential, and nobody else to anything", () => {
    const lookup = userTokensFor(guarded(defaultGrants()), file)!;
    expect(lookup(principal("alice"))).toBe("alice-pat");
    expect(lookup(principal("bob"))).toBeUndefined();
    expect(lookup(principal("alice", "globex"))).toBeUndefined();
  });
  it("refuses to start when the connector enforces user tokens and none are configured", () => {
    expect(() => userTokensFor(guarded(defaultGrants()), undefined)).toThrow("BRAIN_USER_TOKENS");
  });
  it("refuses a tokens file for a connector that does not enforce them", () => {
    expect(() => userTokensFor(createFolderConnector("folder", dir), file)).toThrow("does not enforce");
  });
  it("rejects a malformed tokens file", () => {
    const bad = join(dir, "bad.json");
    writeFileSync(bad, JSON.stringify({ "acme:alice": 5 }));
    expect(() => userTokensFor(guarded(defaultGrants()), bad)).toThrow("BRAIN_USER_TOKENS");
    expect(() => userTokensFor(guarded(defaultGrants()), join(dir, "missing.json"))).toThrow("BRAIN_USER_TOKENS");
  });
});
