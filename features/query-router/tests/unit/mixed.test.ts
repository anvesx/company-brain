import { describe, expect, it } from "vitest";
import { route } from "../../src/index.js";

const ctx = { sources: ["slack", "github", "drive", "jira"], hasGraph: true, hasRag: true };

describe("mixed routing", () => {
  it.each([
    "Who owns the policy summarized last week?",
    "What does the handbook say about who owns leave?",
    "Find the doc about members of platform",
    "Summarize what is linked to Atlas",
  ])("uses both legs for %s", (question) => {
    expect(route(question, ctx)).toEqual({ mode: "both", sources: ctx.sources, depth: "multi" });
  });

  it("uses both legs when two sources are named", () => {
    expect(route("Search Slack and GitHub for the launch date", ctx)).toEqual({
      mode: "both",
      sources: ["slack", "github"],
      depth: "multi",
    });
  });

  it("drops named sources that are not connected", () => {
    expect(route("Summarize Notion and Drive", ctx)).toEqual({
      mode: "both",
      sources: ["drive"],
      depth: "multi",
    });
  });
});
