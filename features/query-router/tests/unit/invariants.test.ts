import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { route } from "../../src/index.js";

describe("routing invariants", () => {
  it("always returns a subset of connected sources", () => {
    fc.assert(
      fc.property(fc.string(), fc.uniqueArray(fc.string(), { maxLength: 12 }), fc.boolean(), fc.boolean(), (question, sources, hasGraph, hasRag) => {
        const result = route(question, { sources, hasGraph, hasRag });
        if (result.mode === "none") return;
        expect(result.sources.every((source) => sources.includes(source))).toBe(true);
      }),
    );
  });

  it("is deterministic and does not mutate context", () => {
    const ctx = { sources: ["drive", "slack"], hasGraph: true, hasRag: true };
    const snapshot = structuredClone(ctx);
    expect(route("Summarize Slack", ctx)).toEqual(route("Summarize Slack", ctx));
    expect(ctx).toEqual(snapshot);
  });
});
