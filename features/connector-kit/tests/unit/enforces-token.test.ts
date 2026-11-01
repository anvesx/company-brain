import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ConnectorError, createFakeConnector, createFolderConnector } from "../../src/index.js";

describe("enforcesUserToken", () => {
  it("is declared false by the fake and folder connectors, which ignore the token", () => {
    expect(createFakeConnector("f", []).enforcesUserToken).toBe(false);
    expect(createFolderConnector("d", mkdtempSync(join(tmpdir(), "ck-"))).enforcesUserToken).toBe(false);
  });

  it("has a FORBIDDEN error code", () => {
    expect(new ConnectorError("FORBIDDEN", "no").code).toBe("FORBIDDEN");
  });
});
