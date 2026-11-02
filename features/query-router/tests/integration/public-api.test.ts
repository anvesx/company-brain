import { describe, expect, it } from "vitest";
import { type Route, type RouteContext, route } from "../../src/index.js";

describe("public API", () => {
  it("restricts sources case-insensitively through the exported contract", () => {
    const context: RouteContext = {
      sources: ["github", "drive", "slack"],
      hasGraph: true,
      hasRag: true,
    };
    const result: Route = route("What does GITHUB say about releases?", context);
    expect(result).toEqual({ mode: "rag", sources: ["github"], depth: "single" });
  });

  it("degrades both routes to the available leg", () => {
    const question = "Who owns the doc in Slack and Drive?";
    const base = { sources: ["slack", "drive"], hasGraph: true, hasRag: true };
    expect(route(question, { ...base, hasGraph: false })).toEqual({
      mode: "rag",
      sources: base.sources,
      depth: "multi",
    });
    expect(route(question, { ...base, hasRag: false })).toEqual({
      mode: "graph",
      sources: base.sources,
      depth: "multi",
    });
  });

  it("ignores signals beyond the UTF-8 4 KiB boundary", () => {
    const question = `${"x".repeat(4096)} who owns this?`;
    const context = { sources: ["slack"], hasGraph: true, hasRag: true };
    expect(route(question, context)).toEqual({ mode: "rag", sources: ["slack"], depth: "single" });
  });
});
