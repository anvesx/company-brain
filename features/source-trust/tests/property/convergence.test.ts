import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { resolveClaims } from "../../src/index.js";
import { arbInput, runs } from "./arb.js";

describe("properties: convergence", () => {
  it("rule 8: converged true implies one more round changes nothing beyond epsilon", () => {
    const epsilon = 1e-6;
    fc.assert(
      fc.property(arbInput(), fc.integer({ min: 1, max: 20 }), (input, maxRounds) => {
        const first = resolveClaims(input, { now: 1000, minClaims: 1, maxRounds, epsilon });
        fc.pre(first.converged);
        const more = resolveClaims(input, { now: 1000, minClaims: 1, maxRounds: maxRounds + 1, epsilon });
        first.sources.forEach((s, i) => {
          expect(Math.abs(s.accuracy - more.sources[i]!.accuracy)).toBeLessThanOrEqual(epsilon);
        });
      }),
      runs,
    );
  });

  it("rule 8: rounds is always between 0 and maxRounds", () => {
    fc.assert(
      fc.property(arbInput(), fc.integer({ min: 1, max: 5 }), (input, maxRounds) => {
        const r = resolveClaims(input, { now: 1000, minClaims: 1, maxRounds });
        expect(r.rounds).toBeGreaterThanOrEqual(0);
        expect(r.rounds).toBeLessThanOrEqual(maxRounds);
        expect(r.rounds === 0).toBe(input.claims.length === 0);
      }),
      runs,
    );
  });
});
