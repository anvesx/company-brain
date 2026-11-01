import { describe, expect, it } from "vitest";
import {
  ConnectorError,
  contentHash,
  createConnectorRegistry,
  createFakeConnector,
} from "../../src/index.js";

describe("connector registry", () => {
  it("registers and retrieves a connector", () => {
    const registry = createConnectorRegistry();
    const connector = createFakeConnector("docs", []);
    registry.register(connector);
    expect(registry.get("docs")).toBe(connector);
  });

  it.each([
    ["duplicate id", () => {
      const registry = createConnectorRegistry();
      registry.register(createFakeConnector("docs", []));
      registry.register(createFakeConnector("docs", []));
    }, "DUPLICATE"],
    ["unknown id", () => createConnectorRegistry().get("missing"), "NOT_FOUND"],
  ])("throws a typed error for %s", (_name, action, code) => {
    expect(action).toThrowError(ConnectorError);
    expect(action).toThrowError(expect.objectContaining({ code }));
  });
});

describe("contentHash", () => {
  it("returns deterministic SHA-256 hex for unicode", () => {
    expect(contentHash("文档")).toBe("2687ccdbb1d2288a8c7867ab8a17e3a70eade5d774aafd0d7eb7b12cbf8165cd");
    expect(contentHash("文档")).toHaveLength(64);
  });
});
