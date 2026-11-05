import { describe, expect, it } from "vitest";
import { resolveClaims, type Source } from "../../../src/index.js";

const sources: Source[] = [
  { id: "s1", class: "wiki" },
  { id: "s2", class: "wiki" },
  { id: "s3", class: "wiki" },
];
const claims = [
  { id: "c1", source: "s1", item: "x1", value: "a", at: 1 },
  { id: "c2", source: "s2", item: "x1", value: "a", at: 1 },
  { id: "c3", source: "s3", item: "x1", value: "b", at: 1 },
  { id: "c4", source: "s1", item: "x2", value: "c", at: 1 },
  { id: "c5", source: "s3", item: "x2", value: "d", at: 1 },
];
const score = (r: ReturnType<typeof resolveClaims>, id: string) => r.sources.find((s) => s.source === id)!;

// Round 1 from priors (wiki 0.75, n = 1 on both items, weight log2(3) = 1.585):
// x1: C(a) = 3.17, C(b) = 1.585. Product form: a = 3 * 3 = 9, b = 3. P(a) = 0.75, P(b) = 0.25.
// x2: C(c) = C(d) = 1.585. P(c) = P(d) = 0.5.
// Eq 1: A(s1) = (0.75 + 0.5) / 2 = 0.625; A(s2) = 0.75; A(s3) = (0.25 + 0.5) / 2 = 0.375.
describe("score/accuracy", () => {
  it("rule 7: accuracy after a round is the mean P(v) of the source's claims", () => {
    const r = resolveClaims({ sources, claims }, { now: 10, minClaims: 1, maxRounds: 1 });
    expect(score(r, "s1")).toEqual({ source: "s1", accuracy: expect.closeTo(0.625, 10), claims: 2, learned: true });
    expect(score(r, "s2").accuracy).toBeCloseTo(0.75, 10);
    expect(score(r, "s3").accuracy).toBeCloseTo(0.375, 10);
  });

  it("rule 7: below minClaims a source keeps its prior and reports learned false", () => {
    const r = resolveClaims({ sources, claims }, { now: 10, minClaims: 2, maxRounds: 1 });
    // s2 has 1 claim < 2: keeps wiki 0.75. s1 still learns 0.625 because s2 voted at its prior.
    expect(score(r, "s2")).toEqual({ source: "s2", accuracy: 0.75, claims: 1, learned: false });
    expect(score(r, "s1").accuracy).toBeCloseTo(0.625, 10);
  });

  it("rule 7: default minClaims is 5, so two claims keep the prior", () => {
    const r = resolveClaims({ sources, claims }, { now: 10 });
    expect(r.sources.every((s) => s.learned === false && s.accuracy === 0.75)).toBe(true);
  });

  it("rule 1: priors override per class", () => {
    const r = resolveClaims({ sources, claims }, { now: 10, priors: { wiki: 0.6 } });
    expect(r.sources.map((s) => s.accuracy)).toEqual([0.6, 0.6, 0.6]);
  });
});
