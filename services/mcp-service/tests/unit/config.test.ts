import { describe, expect, it } from "vitest";
import { McpServiceError, startMcpServer } from "../../src/index.js";

const base = { search: async () => [], principalFor: () => ({ id: "u", tenantId: "t", groups: [] }) };

describe("startMcpServer configuration", () => {
  it.each([
    ["unknown transport", { transport: "ws" }],
    ["negative port", { transport: "http", port: -1 }],
    ["fractional port", { transport: "http", port: 1.5 }],
    ["port above 65535", { transport: "http", port: 70000 }],
    ["port with stdio", { transport: "stdio", port: 80 }],
  ])("rejects %s with INVALID_CONFIG", async (_name, extra) => {
    const err = await startMcpServer({ ...base, ...extra } as never).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(McpServiceError);
    expect((err as McpServiceError).code).toBe("INVALID_CONFIG");
  });
});
