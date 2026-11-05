import { describe, expect, it } from "vitest";
import { voteWeight } from "../../../src/score/weight.js";

// Rule 2: A'(S) = log2(n A / (1 - A)), A clamped to [0.01, 0.99].
// Base 2 because Eq 4 is the product form P(v) = prod nA/(1-A) / sum prod nA/(1-A), and
// P(v) = 2^C(v) / sum 2^C only equals it when C uses log2.
// data-fusion-dong-2015 Example 2 prints 4.7, 2, 1.5 for 0.97, 0.6, 0.4 at n = 5. No log base
// reproduces all three (ln gives 5.09, 2.01, 1.20), so the paper's printed example does not
// follow from its own Eq 3. We assert Eq 3 as written.
describe("score/weight", () => {
  it.each([
    // 5 * 0.97 / 0.03 = 161.67, log2(161.67) = 7.34
    [0.97, 5, 7.34],
    // 5 * 0.6 / 0.4 = 7.5, log2(7.5) = 2.91
    [0.6, 5, 2.91],
    // 5 * 0.4 / 0.6 = 3.33, log2(3.33) = 1.74
    [0.4, 5, 1.74],
  ])("rule 2: worked example, accuracy %f with n = %i weighs %f", (accuracy, n, expected) => {
    expect(voteWeight(accuracy, n)).toBeCloseTo(expected, 2);
  });

  it("rule 2: signed prior 0.95 at n = 1 weighs log2(0.95 / 0.05) = log2(19) = 4.2479", () => {
    expect(voteWeight(0.95, 1)).toBeCloseTo(4.2479, 4);
  });

  it("rule 2: chat prior 0.5 at n = 1 weighs log2(1) = 0", () => {
    expect(voteWeight(0.5, 1)).toBeCloseTo(0, 10);
  });

  it("rule 2: below 1 / (1 + n) the weight is negative, log2(1 * 0.4 / 0.6) = -0.585", () => {
    expect(voteWeight(0.4, 1)).toBeCloseTo(-0.585, 3);
  });

  it("rule 2: accuracy clamps to [0.01, 0.99], so 1 and 0 stay finite", () => {
    // log2(5 * 0.99 / 0.01) = log2(495) = 8.951; log2(5 * 0.01 / 0.99) = log2(0.0505) = -4.307
    expect(voteWeight(1, 5)).toBeCloseTo(8.951, 3);
    expect(voteWeight(0, 5)).toBeCloseTo(-4.307, 3);
    expect(voteWeight(1, 5)).toBe(voteWeight(0.99, 5));
    expect(voteWeight(0, 5)).toBe(voteWeight(0.01, 5));
  });

  it("rule 2: the weight rises with accuracy (Theorem 1 property 2)", () => {
    expect(voteWeight(0.8, 3)).toBeGreaterThan(voteWeight(0.7, 3));
  });
});
