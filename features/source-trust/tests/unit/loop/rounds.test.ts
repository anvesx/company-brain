import { describe, expect, it } from "vitest";
import { prepare } from "../../../src/input/prepare.js";
import { runRounds } from "../../../src/score/rounds.js";

// Two wiki sources (prior 0.75). Item x: s1 says "a", s2 says "b". Item y: only s1 says "c".
const sources = [
  { id: "s1", class: "wiki" as const },
  { id: "s2", class: "wiki" as const },
];
const claims = [
  { id: "c1", source: "s1", item: "x", value: "a", at: 1 },
  { id: "c2", source: "s2", item: "x", value: "b", at: 1 },
  { id: "c3", source: "s1", item: "y", value: "c", at: 1 },
];
const model = prepare({ sources, claims }, { now: 2 });
const settings = { minClaims: 1, maxRounds: 1, epsilon: 1e-6 };

describe("loop/rounds exact", () => {
  it("rule 14: one round visits 2 I + 2 N + 5 V + 3 S = 31 elements", () => {
    // I = 2 items (x, y), N = 3 claims, V = 3 values (a, b, c), S = 2 sources.
    // voteItem: x 2 claims + 5 * 2 values = 12, y 1 + 5 * 1 = 6, so 18 inside the item loop.
    // Per round, outside it: items.map 2, sums init 2, items.forEach 2, accuracy-sum loop 3,
    // learnAccuracy 2, convergence reduce 2 = 13. Total 18 + 13 = 31.
    const run = runRounds(model, settings);
    expect(run.rounds).toBe(1);
    expect(run.visits).toBe(31);
  });

  it("rule 15: a model with no items runs no round, keeps the priors and returns no votes", () => {
    const empty = prepare({ sources, claims: [] }, { now: 2 });
    expect(runRounds(empty, settings)).toEqual({ accuracy: [0.75, 0.75], votes: [], rounds: 0, converged: true, visits: 0 });
  });

  it("rule 8: a change exactly equal to epsilon has not converged yet", () => {
    // Round 1. x: both votes weigh log2(3), so P(a) = P(b) = 0.5. y: P(c) = 1.
    // s1 = (0.5 + 1) / 2 = 0.75, s2 = 0.5 / 1 = 0.5. Change = max(|0.75 - 0.75|, |0.5 - 0.75|) = 0.25.
    const first = runRounds(model, settings);
    expect(first.accuracy).toEqual([0.75, 0.5]);
    // The rule is change < epsilon. With epsilon = 0.25 round 1 does not stop (0.25 < 0.25 is
    // false), so at least a second round runs; `<=` would stop after round 1.
    const run = runRounds(model, { ...settings, maxRounds: 20, epsilon: 0.25 });
    expect(run.rounds).toBeGreaterThan(1);
    // Round 2 moves s2 from 0.5 to 0.25, a change of 0.25 again, so round 2 does not stop either.
    expect(runRounds(model, { ...settings, maxRounds: 2, epsilon: 0.25 }).converged).toBe(false);
  });
});
