import { describe, expect, it } from "vitest";
import { resolveClaims } from "../../src/index.js";
import { precision, synthetic } from "./synthetic.js";

// Spec acceptance "research replication": direction of Dong 2009 Table 3 (VOTE 0.71, then
// ACCUCOPY 0.87 on real data). Here on seeded synthetic data, seed 42.
describe("research replication", () => {
  it("rules 2, 4, 7, 8: copy edges >= accuracy rounds >= majority vote on the fixed seed", () => {
    const world = synthetic(42);
    const { sources, claims, copies, truth } = world;
    // (a) Majority vote: every source is wiki with the same prior, one round, no copies.
    // Equal accuracies reduce Eq 3 and 4 to naive voting (Theorem 1).
    const vote = precision(resolveClaims({ sources, claims }, { now: 0, maxRounds: 1 }).items, truth);
    // (b) Accuracy rounds from the class priors, no copy edges.
    const rounds = precision(resolveClaims({ sources, claims }, { now: 0 }).items, truth);
    // (c) Accuracy rounds plus the five known copy edges at share 0.8.
    const copy = precision(resolveClaims({ sources, claims, copies }, { now: 0 }).items, truth);
    console.log(`majority vote: ${vote.correct} of ${vote.total} = ${vote.value.toFixed(3)}`);
    console.log(`accuracy rounds: ${rounds.correct} of ${rounds.total} = ${rounds.value.toFixed(3)}`);
    console.log(`rounds plus copy edges: ${copy.correct} of ${copy.total} = ${copy.value.toFixed(3)}`);
    expect(vote.total).toBe(500);
    expect(rounds.value).toBeGreaterThanOrEqual(vote.value);
    expect(copy.value).toBeGreaterThanOrEqual(rounds.value);
  });

  it("the generator is deterministic for a seed and has the stated shape", () => {
    const a = synthetic(42);
    expect(synthetic(42)).toEqual(a);
    expect(a.sources).toHaveLength(25);
    // 25 sources x 500 items x about 0.15 coverage: between 1000 and 3000 claims, never all.
    expect(a.claims.length).toBeGreaterThan(1000);
    expect(a.claims.length).toBeLessThan(3000);
    expect(a.copies).toHaveLength(5);
    expect(a.copies.every((c) => c.share === 0.8)).toBe(true);
    expect(new Set(a.truth.values())).toEqual(new Set(["a", "b", "c", "d"]));
  });
});
