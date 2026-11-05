import { describe, expect, it } from "vitest";
import { resolveClaims } from "../../../../src/index.js";

/** n wiki sources s0..s(n-1) all claiming "a" on item x; s(k) copies s(k-1) with share 0.5. */
const chain = (n: number) => {
  const sources = Array.from({ length: n }, (_, i) => ({ id: `s${i}`, class: "wiki" as const }));
  const claims = sources.map((s, i) => ({ id: `c${i}`, source: s.id, item: "x", value: "a", at: 1 }));
  const copies = sources.slice(1).map((s, i) => ({ copier: s.id, original: `s${i}`, share: 0.5 }));
  return { sources, claims, copies };
};
const scoreOf = (input: ReturnType<typeof chain>): number => resolveClaims(input, { now: 2 }).items[0]!.groups[0]!.score;

// Rule 4 by the documented formula. One value, so n = max(1, 1 - 1) = 1 and a wiki source (0.75)
// weighs log2(1 * 0.75 / 0.25) = log2 3. Source k sits k links down the chain, so its factor is
// 0.5^k, and the score is log2(3) * (1 + 0.5 + ... + 0.5^(n-1)) = log2(3) * (2 - 2^(1-n)).
const expected = (n: number): number => Math.log2(3) * (2 - 2 ** (1 - n));

describe("score/copy chain", () => {
  it("rule 4: a 50-source chain scores log2(3) * (2 - 2^-49)", () => {
    expect(scoreOf(chain(50))).toBeCloseTo(expected(50), 12);
  });

  it("rule 4: a 20,000-source chain resolves without a stack overflow and scores log2(3) * 2", () => {
    expect(scoreOf(chain(20_000))).toBeCloseTo(expected(20_000), 12);
  });

  it("rule 4: a two-source copy cycle stops where it closes, giving factors 0.25 and 0.5", () => {
    // Walk from s0: s0 -> s1 -> back to s0 (held at 1), so s1 = 0.5 * 1 and s0 = 0.5 * 0.5.
    const sources = [
      { id: "s0", class: "wiki" as const },
      { id: "s1", class: "wiki" as const },
    ];
    const claims = sources.map((s, i) => ({ id: `c${i}`, source: s.id, item: "x", value: "a", at: 1 }));
    const copies = [
      { copier: "s0", original: "s1", share: 0.5 },
      { copier: "s1", original: "s0", share: 0.5 },
    ];
    expect(scoreOf({ sources, claims, copies })).toBeCloseTo(Math.log2(3) * (0.25 + 0.5), 12);
  });
});
