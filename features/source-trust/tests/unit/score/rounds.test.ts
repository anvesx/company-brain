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

describe("score/rounds", () => {
  it("rule 8: maxRounds 1 on a conflict reports rounds 1 and converged false", () => {
    // Round 1 moves s1 from 0.75 to 0.625 (see accuracy.test.ts), a change of 0.125 > epsilon.
    const r = resolveClaims({ sources, claims }, { now: 10, minClaims: 1, maxRounds: 1 });
    expect(r.rounds).toBe(1);
    expect(r.converged).toBe(false);
  });

  it("rule 8: rounds never exceed maxRounds", () => {
    for (const maxRounds of [1, 2, 3, 7]) {
      const r = resolveClaims({ sources, claims }, { now: 10, minClaims: 1, maxRounds, epsilon: 1e-15 });
      expect(r.rounds).toBeLessThanOrEqual(maxRounds);
      expect(r.rounds >= maxRounds || r.converged).toBe(true);
    }
  });

  it("rule 8: when no source can learn, round 1 changes nothing and the loop stops converged", () => {
    // Default minClaims 5: every source keeps its prior, so the change after round 1 is 0.
    const r = resolveClaims({ sources, claims }, { now: 10 });
    expect(r.rounds).toBe(1);
    expect(r.converged).toBe(true);
  });

  it("rule 8: default maxRounds is 20", () => {
    const r = resolveClaims({ sources, claims }, { now: 10, minClaims: 1, epsilon: 1e-300 });
    expect(r.rounds).toBeLessThanOrEqual(20);
    expect(r.rounds === 20 || r.converged).toBe(true);
  });

  it("rule 15: empty claims give items [], priors, rounds 0, converged true", () => {
    const r = resolveClaims({ sources: [{ id: "s1", class: "signed" }], claims: [] }, { now: 0 });
    expect(r).toEqual({
      sources: [{ source: "s1", accuracy: 0.95, claims: 0, learned: false }],
      items: [],
      rounds: 0,
      converged: true,
    });
  });
});
