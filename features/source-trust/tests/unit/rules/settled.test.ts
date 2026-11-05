import { describe, expect, it } from "vitest";
import { resolveClaims, type Source } from "../../../src/index.js";

const claimsAt = (atA: number, atB: number) => [
  { id: "c1", source: "s1", item: "x", value: "a", at: atA },
  { id: "c2", source: "s2", item: "x", value: "b", at: atB },
];
// a scores 9e-9 above b: inside epsilon 1e-6, so rule 6 compares newest times.
const close: Source[] = [
  { id: "s1", class: "signed" },
  { id: "s2", class: "record" },
];
const near = { now: 30, priors: { signed: 0.800000001, record: 0.8 } };

describe("rules: winner and settled items", () => {
  it("rule 6: within epsilon the top group that is also newer wins, tie false", () => {
    const r = resolveClaims({ sources: close, claims: claimsAt(9, 5) }, near);
    expect(r.items[0]).toMatchObject({ value: "a", tie: false });
  });

  it("rule 6: within epsilon a strictly newer loser flips, equal times give the smaller value, tie true", () => {
    expect(resolveClaims({ sources: close, claims: claimsAt(5, 9) }, near).items[0]).toMatchObject({ value: "b", tie: false });
    expect(resolveClaims({ sources: close, claims: claimsAt(7, 7) }, near).items[0]).toMatchObject({ value: "a", tie: true });
  });

  it("rule 6: outside epsilon the top score wins even against a newer loser", () => {
    // signed 0.95 against chat 0.5 gives C(a) = 4.25, C(b) = 0, far above epsilon.
    const far: Source[] = [
      { id: "s1", class: "signed" },
      { id: "s2", class: "chat" },
    ];
    expect(resolveClaims({ sources: far, claims: claimsAt(5, 9) }, { now: 30 }).items[0]).toMatchObject({ value: "a", tie: false });
  });

  it("rule 9: a correction to the first value (index 0) still pins it and moves accuracy", () => {
    const sources: Source[] = [
      { id: "s1", class: "wiki" },
      { id: "s2", class: "wiki" },
    ];
    const corrections = [{ item: "x", value: "a", at: 5 }];
    const r = resolveClaims({ sources, claims: claimsAt(1, 1), corrections }, { now: 10, minClaims: 1 });
    // Values sort to [a, b]; a is index 0. P(a) = 1, P(b) = 0, so A(s1) = 0.99 and A(s2) = 0.01, below prior 0.75.
    expect(r.items[0]).toMatchObject({ value: "a", confidence: 1, corrected: true, tie: false });
    expect(r.items[0]!.groups.map((g) => [g.value, g.confidence])).toEqual([
      ["a", 1],
      ["b", 0],
    ]);
    expect(r.sources.map((s) => s.accuracy)).toEqual([0.99, 0.01]);
  });
});
