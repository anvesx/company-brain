import { describe, expect, it } from "vitest";
import { resolveClaims, type Source } from "../../../src/index.js";
import { expectBadInput, put } from "../input/cases.js";

const sources: Source[] = [
  { id: "s1", class: "wiki" },
  { id: "s2", class: "wiki" },
];
// s1 claims i1..i5 and s2 claims i1..i4, all one value per item, so every P is 1.
const claims = [1, 2, 3, 4, 5].flatMap((k) => [
  { id: `a${k}`, source: "s1", item: `i${k}`, value: "v", at: 1 },
  ...(k <= 4 ? [{ id: `b${k}`, source: "s2", item: `i${k}`, value: "v", at: 1 }] : []),
]);
const accuracyOf = (r: ReturnType<typeof resolveClaims>) => r.sources.map((s) => s.accuracy);

describe("resolve: defaults and options", () => {
  it("rules 7, 8: default minClaims 5 and epsilon 1e-6; s1 learns 0.99, s2 keeps prior 0.75", () => {
    const r = resolveClaims({ sources, claims }, { now: 10 });
    // Round 1: s1 (5 claims >= 5) goes 0.75 to 0.99, change 0.24. Round 2: change 0 < 1e-6.
    expect(r.sources).toEqual([
      { source: "s1", accuracy: 0.99, claims: 5, learned: true },
      { source: "s2", accuracy: 0.75, claims: 4, learned: false },
    ]);
    expect([r.rounds, r.converged]).toEqual([2, true]);
  });

  it("rules 7, 8: minClaims 4 lets s2 learn; maxRounds 1 stops at round 1 and says so", () => {
    expect(accuracyOf(resolveClaims({ sources, claims }, { now: 10, minClaims: 4 }))).toEqual([0.99, 0.99]);
    const r = resolveClaims({ sources, claims }, { now: 10, maxRounds: 1 });
    expect([r.rounds, r.converged]).toEqual([1, false]); // change 0.24 is not below epsilon
  });

  it("rule 10: the call does not mutate its input", () => {
    const input = { sources, claims };
    const snapshot = structuredClone(input);
    resolveClaims(input, { now: 10 });
    expect(input).toEqual(snapshot);
  });

  it("rule 12: an unknown source class is BAD_INPUT naming sources[0].class", () => {
    expectBadInput(put("sources", 0, "class", "blog"), "sources[0].class");
  });

  it("rule 12: an unknown prior key is BAD_INPUT naming options.priors.blog", () => {
    expectBadInput((call) => {
      call.options["priors"] = { blog: 0.5 };
    }, "options.priors.blog");
  });
});
