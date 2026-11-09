import { describe, expect, it } from "vitest";
import { INPUT, TOOL_NAMES } from "../../src/tools/schema.js";

// The zod input schemas the server registers. Wrong types and oversize values must fail here, before any
// handler runs. An empty or blank query passes the schema on purpose: the handler answers INVALID_ARGUMENT.
const ok = (tool: keyof typeof INPUT, args: unknown) => INPUT[tool].safeParse(args).success;

describe("tool names", () => {
  it("are exactly the four read tools, in a stable order", () => {
    expect([...TOOL_NAMES]).toEqual(["brain.search", "brain.node", "brain.graph", "brain.connectors"]);
  });
});

describe("brain.search input", () => {
  it("accepts a query with optional kinds and limit", () => {
    expect(ok("brain.search", { query: "plan" })).toBe(true);
    expect(ok("brain.search", { query: "plan", kinds: ["document", "project"], limit: 100 })).toBe(true);
  });
  it("lets an empty query through to the handler", () => {
    expect(ok("brain.search", { query: "" })).toBe(true);
  });
  it("rejects a query over 512 characters", () => {
    expect(ok("brain.search", { query: "x".repeat(512) })).toBe(true);
    expect(ok("brain.search", { query: "x".repeat(513) })).toBe(false);
  });
  it("rejects wrong types and unknown kinds", () => {
    expect(ok("brain.search", { query: 42 })).toBe(false);
    expect(ok("brain.search", {})).toBe(false);
    expect(ok("brain.search", { query: "a", kinds: ["secret"] })).toBe(false);
    expect(ok("brain.search", { query: "a", kinds: "document" })).toBe(false);
  });
  it("bounds limit to whole numbers 1..100", () => {
    for (const limit of [0, 101, 1.5, -1, "20"]) expect(ok("brain.search", { query: "a", limit })).toBe(false);
    expect(ok("brain.search", { query: "a", limit: 1 })).toBe(true);
  });
  it("defaults limit to 20", () => {
    expect(INPUT["brain.search"].parse({ query: "a" }).limit).toBe(20);
  });
});

describe("brain.node input", () => {
  it("needs a non-empty id up to 512 characters and an optional finite asOf", () => {
    expect(ok("brain.node", { id: "doc-1" })).toBe(true);
    expect(ok("brain.node", { id: "doc-1", asOf: 1_700_000_000_000 })).toBe(true);
    expect(ok("brain.node", { id: "" })).toBe(false);
    expect(ok("brain.node", { id: "x".repeat(513) })).toBe(false);
    expect(ok("brain.node", { id: 7 })).toBe(false);
    expect(ok("brain.node", { id: "a", asOf: "yesterday" })).toBe(false);
    expect(ok("brain.node", { id: "a", asOf: Number.POSITIVE_INFINITY })).toBe(false);
  });
});

describe("brain.graph input", () => {
  it("takes an optional cursor and a limit of 1..20000, default 5000", () => {
    expect(INPUT["brain.graph"].parse({}).limit).toBe(5000);
    expect(ok("brain.graph", { cursor: "doc-9", limit: 20_000 })).toBe(true);
    expect(ok("brain.graph", { limit: 20_001 })).toBe(false);
    expect(ok("brain.graph", { limit: 0 })).toBe(false);
    expect(ok("brain.graph", { cursor: "x".repeat(513) })).toBe(false);
    expect(ok("brain.graph", { cursor: 3 })).toBe(false);
  });
});

describe("brain.connectors input", () => {
  it("takes an empty object", () => {
    expect(ok("brain.connectors", {})).toBe(true);
  });
});
