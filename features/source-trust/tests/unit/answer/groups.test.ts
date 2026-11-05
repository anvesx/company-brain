import { describe, expect, it } from "vitest";
import { resolveClaims, type Source } from "../../../src/index.js";

const sources: Source[] = [
  { id: "s2", class: "wiki" },
  { id: "s1", class: "wiki" },
  { id: "s4", class: "chat" },
  { id: "s3", class: "chat" },
];
const claims = [
  { id: "c4", source: "s4", item: "x", value: "c", at: 3 },
  { id: "c1", source: "s1", item: "x", value: "a", at: 5 },
  { id: "c3", source: "s3", item: "x", value: "b", at: 7 },
  { id: "c2", source: "s2", item: "x", value: "a", at: 9 },
];

describe("answer/groups", () => {
  it("rule 6: every group is returned, sorted by score then value, with sorted sources", () => {
    const r = resolveClaims({ sources, claims }, { now: 10 });
    // n = 2. wiki log2(2 * 0.75 / 0.25) = log2(6) = 2.585; chat log2(2 * 0.5 / 0.5) = 1.
    // C(a) = 5.1699, C(b) = C(c) = 1. 2^C: 36, 2, 2 of 40. P = 0.9, 0.05, 0.05.
    // b and c tie on score, so value order puts b first.
    expect(r.items).toEqual([
      {
        item: "x",
        value: "a",
        confidence: expect.closeTo(0.9, 10),
        tie: false,
        corrected: false,
        groups: [
          { value: "a", score: expect.closeTo(Math.log2(36), 10), confidence: expect.closeTo(0.9, 10), sources: ["s1", "s2"], newestAt: 9 },
          { value: "b", score: expect.closeTo(1, 10), confidence: expect.closeTo(0.05, 10), sources: ["s3"], newestAt: 7 },
          { value: "c", score: expect.closeTo(1, 10), confidence: expect.closeTo(0.05, 10), sources: ["s4"], newestAt: 3 },
        ],
      },
    ]);
  });

  it("rule 6: a single-value item wins with confidence 1", () => {
    const r = resolveClaims({ sources, claims: [claims[0]!] }, { now: 10 });
    expect(r.items[0]).toMatchObject({ item: "x", value: "c", confidence: 1, tie: false });
    expect(r.items[0]!.groups).toHaveLength(1);
  });

  it("rule 10: items come back sorted by item id", () => {
    const more = [...claims, { id: "c9", source: "s1", item: "a-item", value: "z", at: 1 }];
    const r = resolveClaims({ sources, claims: more }, { now: 10 });
    expect(r.items.map((i) => i.item)).toEqual(["a-item", "x"]);
  });

  it("rule 6: a score gap exactly equal to epsilon is not a tie, the higher score wins", () => {
    // signed s1 (0.95) says "a" at 1000, chat s2 (0.5) says "b" at 2000, one claim each so both keep
    // their priors. n = 1: C(a) = log2(0.95 / 0.05) = log2(19) = 4.2479, C(b) = log2(0.5 / 0.5) = 0.
    // The gap is log2(19). The newest claim ("b") belongs to the LOWER score, so the two branches differ.
    const input = {
      sources: [
        { id: "s1", class: "signed" as const },
        { id: "s2", class: "chat" as const },
      ],
      claims: [
        { id: "c1", source: "s1", item: "x", value: "a", at: 1000 },
        { id: "c2", source: "s2", item: "x", value: "b", at: 2000 },
      ],
    };
    const gap = Math.log2(19);
    const [top, next] = resolveClaims(input, { now: 3000 }).items[0]!.groups;
    expect(top!.score - next!.score).toBeCloseTo(gap, 12);
    // epsilon = the exact gap: gap >= epsilon, so the score decides. `>` would fall to the newest claim.
    const exact = resolveClaims(input, { now: 3000, epsilon: top!.score - next!.score }).items[0]!;
    expect([exact.value, exact.tie]).toEqual(["a", false]);
    // Control: an epsilon just above the gap puts both inside the window, so the newest claim wins.
    const wider = resolveClaims(input, { now: 3000, epsilon: gap + 1e-9 }).items[0]!;
    expect([wider.value, wider.tie]).toEqual(["b", false]);
  });
});
