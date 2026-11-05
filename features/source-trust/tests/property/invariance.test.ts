import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { labelPassages, resolveClaims } from "../../src/index.js";
import { arbInput, arbShuffled, deepFreeze, runs } from "./arb.js";

const opts = { now: 1000, minClaims: 2 };

describe("properties: determinism and shape", () => {
  it("rule 10: permutation invariance, shuffled claims and sources give deep-equal output", () => {
    fc.assert(
      fc.property(arbShuffled, ([input, shuffled]) => {
        expect(resolveClaims(shuffled, opts)).toEqual(resolveClaims(input, opts));
      }),
      runs,
    );
  });

  it("rule 6: items cover every input item exactly once", () => {
    fc.assert(
      fc.property(arbInput(), (input) => {
        const items = resolveClaims(input, opts).items.map((i) => i.item);
        expect([...items].sort()).toEqual([...new Set(input.claims.map((c) => c.item))].sort());
      }),
      runs,
    );
  });

  it("rule 2 and 7: every accuracy is in [0.01, 0.99] under the default priors", () => {
    fc.assert(
      fc.property(arbInput(), (input) => {
        for (const s of resolveClaims(input, { now: 1000, minClaims: 1 }).sources) {
          expect(s.accuracy).toBeGreaterThanOrEqual(0.01);
          expect(s.accuracy).toBeLessThanOrEqual(0.99);
        }
      }),
      runs,
    );
  });

  it("rule 11: labelPassages output length equals input length", () => {
    const passage = fc.record({ source: fc.constantFrom("s0", "s1", "zz"), item: fc.constantFrom("i0", "i9") }, { requiredKeys: ["source"] });
    fc.assert(
      fc.property(arbInput(), fc.array(passage, { maxLength: 20 }), (input, passages) => {
        expect(labelPassages(passages, resolveClaims(input, opts))).toHaveLength(passages.length);
      }),
      runs,
    );
  });

  it("rule 10: inputs are never mutated, frozen inputs do not throw", () => {
    fc.assert(
      fc.property(arbInput(), (input) => {
        const expected = resolveClaims(structuredClone(input), opts);
        const frozen = deepFreeze(structuredClone(input));
        expect(resolveClaims(frozen, deepFreeze({ ...opts }))).toEqual(expected);
      }),
      runs,
    );
  });
});
