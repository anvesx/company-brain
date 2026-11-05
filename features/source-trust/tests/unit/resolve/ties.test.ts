import { describe, expect, it } from "vitest";
import { resolveClaims, type Source } from "../../../src/index.js";

const sources: Source[] = [
  { id: "s1", class: "wiki" },
  { id: "s2", class: "wiki" },
];
const claimsAt = (atA: number, atB: number) => [
  { id: "c1", source: "s1", item: "x", value: "a", at: atA },
  { id: "c2", source: "s2", item: "x", value: "b", at: atB },
];

describe("resolve: ties", () => {
  it("rule 6: tie broken by newest claim, tie false", () => {
    // Both wiki: C(a) = C(b) = log2(3), within epsilon. b has the newest claim (20 > 10).
    const r = resolveClaims({ sources, claims: claimsAt(10, 20) }, { now: 30 });
    expect(r.items[0]).toMatchObject({ value: "b", tie: false, confidence: expect.closeTo(0.5, 10) });
    // Groups still sort by score then value, so a stays first.
    expect(r.items[0]!.groups.map((g) => g.value)).toEqual(["a", "b"]);
  });

  it("rule 6: same timestamp gives the lexicographically smaller value and tie true", () => {
    const r = resolveClaims({ sources, claims: claimsAt(10, 10) }, { now: 30 });
    expect(r.items[0]).toMatchObject({ value: "a", tie: true });
  });

  it("rule 6: scores within epsilon count as a tie", () => {
    // Priors 1e-9 apart: |C(a) - C(b)| = 1e-9 / (ln 2 * 0.8 * 0.2) = 9e-9, below epsilon 1e-6.
    // First case a scores higher but b is newer, so b wins. Second case b scores higher but
    // both share at 5, so the smaller value a wins with tie true.
    const close: Source[] = [
      { id: "s1", class: "signed" },
      { id: "s2", class: "record" },
    ];
    const r = resolveClaims({ sources: close, claims: claimsAt(5, 9) }, { now: 30, priors: { signed: 0.800000001, record: 0.8 } });
    expect(r.items[0]).toMatchObject({ value: "b", tie: false });
    const same = resolveClaims({ sources: close, claims: claimsAt(5, 5) }, { now: 30, priors: { signed: 0.8, record: 0.800000001 } });
    expect(same.items[0]).toMatchObject({ value: "a", tie: true });
  });
});
