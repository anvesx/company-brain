import { describe, expect, it } from "vitest";
import { route } from "../../../src/index.js";

const sources = ["slack"];

describe("availability branches", () => {
  it("degrades a graph-only signal to RAG", () => {
    expect(route("Which team owns search?", { sources, hasGraph: false, hasRag: true })).toEqual({ mode: "rag", sources, depth: "single" });
  });

  it("degrades a RAG-only signal to graph", () => {
    expect(route("Summarize launch", { sources, hasGraph: true, hasRag: false })).toEqual({ mode: "graph", sources, depth: "single" });
  });

  it("returns none for every requested mode when both legs are absent", () => {
    const context = { sources, hasGraph: false, hasRag: false };
    expect(route("Who owns the summarized policy?", context)).toEqual({ mode: "none" });
    expect(route("Summarize launch", context)).toEqual({ mode: "none" });
  });
});
