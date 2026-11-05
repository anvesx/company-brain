import { describe, expect, it } from "vitest";
import { resolveClaims, type Source } from "../../../src/index.js";

const sources: Source[] = [
  { id: "s1", class: "signed" },
  { id: "s2", class: "chat" },
];
const claims = [
  { id: "c1", source: "s1", item: "x", value: "a", at: 1 },
  { id: "c2", source: "s2", item: "x", value: "b", at: 2 },
];

describe("resolve: two-source conflict", () => {
  it("rule 1 and 3: the signed source beats the chat source", () => {
    const r = resolveClaims({ sources, claims }, { now: 10 });
    // n = 1. C(a) = log2(0.95 / 0.05) = log2(19) = 4.2479. C(b) = log2(0.5 / 0.5) = 0.
    // P(a) = 2^4.2479 / (2^4.2479 + 2^0) = 19 / 20 = 0.95. P(b) = 1 / 20 = 0.05.
    expect(r.items).toEqual([
      {
        item: "x",
        value: "a",
        confidence: expect.closeTo(0.95, 10),
        tie: false,
        corrected: false,
        groups: [
          { value: "a", score: expect.closeTo(Math.log2(19), 10), confidence: expect.closeTo(0.95, 10), sources: ["s1"], newestAt: 1 },
          { value: "b", score: expect.closeTo(0, 10), confidence: expect.closeTo(0.05, 10), sources: ["s2"], newestAt: 2 },
        ],
      },
    ]);
  });

  it("rule 1: every class has its documented prior", () => {
    const classes = ["signed", "record", "wiki", "ticket", "news", "chat", "draft", "opinion"] as const;
    const all: Source[] = classes.map((c) => ({ id: c, class: c }));
    const r = resolveClaims({ sources: all, claims: [] }, { now: 0 });
    // Sources come back sorted by id.
    expect(Object.fromEntries(r.sources.map((s) => [s.source, s.accuracy]))).toEqual({
      chat: 0.5,
      draft: 0.4,
      news: 0.55,
      opinion: 0.35,
      record: 0.9,
      signed: 0.95,
      ticket: 0.65,
      wiki: 0.75,
    });
    expect(r.sources.map((s) => s.source)).toEqual(["chat", "draft", "news", "opinion", "record", "signed", "ticket", "wiki"]);
  });

  it("rule 1: overriding the chat prior to 0.99 flips the winner", () => {
    // chat 0.99 at n = 1: log2(99) = 6.63 > log2(19) = 4.25.
    const r = resolveClaims({ sources, claims }, { now: 10, priors: { chat: 0.99 } });
    expect(r.items[0]!.value).toBe("b");
  });
});
