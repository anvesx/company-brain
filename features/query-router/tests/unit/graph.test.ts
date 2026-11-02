import { describe, expect, it } from "vitest";
import { route } from "../../src/index.js";

const ctx = { sources: ["slack", "github", "drive"], hasGraph: true, hasRag: true };

describe("graph signals", () => {
  it.each([
    "Who owns payments?",
    "Which team runs search?",
    "Who is linked to Project Atlas?",
    "List the members of platform",
    "Show engineering membership",
    "Which people work on security?",
    "Who belongs to the design team?",
    "Find the owner of the API",
  ])("routes %s to graph", (question) => {
    expect(route(question, ctx)).toEqual({
      mode: "graph",
      sources: ctx.sources,
      depth: "single",
    });
  });
});
