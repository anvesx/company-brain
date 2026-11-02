import { describe, expect, it } from "vitest";
import { route } from "../../../src/index.js";

const ctx = { sources: ["slack"], hasGraph: true, hasRag: true };

describe("no retrieval", () => {
  it.each(["", "   \n\t", "hello", "Hi!", "good morning", "thanks", "Thank you very much!", "hey there"])("routes %j to none", (question) => {
    expect(route(question, ctx)).toEqual({ mode: "none" });
  });

  it("returns none when neither retrieval leg exists", () => {
    expect(route("Who owns search?", { ...ctx, hasGraph: false, hasRag: false })).toEqual({ mode: "none" });
  });
});
