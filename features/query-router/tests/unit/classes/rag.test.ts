import { describe, expect, it } from "vitest";
import { route } from "../../../src/index.js";

const ctx = { sources: ["slack", "github", "drive"], hasGraph: true, hasRag: true };

describe("rag signals", () => {
  it.each([
    'Find "launch checklist"',
    "What does the handbook say about leave?",
    "Summarize the incident review",
    "Find the doc about onboarding",
    "Quote the security policy",
    "What does our roadmap contain?",
    "Summarise the architecture decision",
    "Find the document about expenses",
  ])("routes %s to rag", (question) => {
    expect(route(question, ctx)).toEqual({
      mode: "rag",
      sources: ctx.sources,
      depth: "single",
    });
  });
});
