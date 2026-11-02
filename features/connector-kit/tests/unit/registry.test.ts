import { describe, expect, it } from "vitest";
import { ConnectorError, createConnectorRegistry } from "../../src/index.js";
import { createFakeConnector } from "../support/fake.js";

describe("connector registry", () => {
  it("registers and retrieves a connector", () => {
    const registry = createConnectorRegistry();
    const connector = createFakeConnector("docs", []);
    registry.register(connector);
    expect(registry.get("docs")).toBe(connector);
  });

  it.each([
    [
      "duplicate id",
      () => {
        const registry = createConnectorRegistry();
        registry.register(createFakeConnector("docs", []));
        registry.register(createFakeConnector("docs", []));
      },
      "DUPLICATE",
    ],
    ["unknown id", () => createConnectorRegistry().get("missing"), "NOT_FOUND"],
  ])("throws a typed error for %s", (_name, action, code) => {
    expect(action).toThrowError(ConnectorError);
    expect(action).toThrowError(expect.objectContaining({ code }));
  });
});
