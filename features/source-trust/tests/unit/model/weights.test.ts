import { describe, expect, it } from "vitest";
import { resolveClaims, type Source } from "../../../src/index.js";

const wiki: Source[] = [
  { id: "s1", class: "wiki" },
  { id: "s2", class: "wiki" },
  { id: "s3", class: "wiki" },
];
const claim = (id: string, source: string, value: string, at: number) => ({ id, source, item: "x", value, at });
const score = (r: ReturnType<typeof resolveClaims>, value: string) => r.items[0]!.groups.find((g) => g.value === value)!.score;

describe("resolve: weights", () => {
  // Two values, so n = 1 and a wiki weight is log2(0.75 / 0.25) = log2(3) = 1.58496.
  it("rule 5: at = now - halfLife gets 0.5, at = now gets 1, the older claim never outweighs the newer", () => {
    // now 2000, half life 1000. Old claim at 1000: age 1000, 0.5^1 = 0.5, C = 0.79248.
    // Fresh claim at 2000: age 0, factor 1, C = 1.58496. A `now + at` age gives 0.125 and 0.1 instead.
    for (const [oldValue, freshValue] of [
      ["a", "b"],
      ["b", "a"],
    ] as const) {
      const claims = [claim("c1", "s1", oldValue, 1000), claim("c2", "s2", freshValue, 2000)];
      const r = resolveClaims({ sources: wiki.slice(0, 2), claims }, { now: 2000, halfLifeMs: 1000 });
      expect(score(r, oldValue)).toBeCloseTo(0.79248, 5);
      expect(score(r, freshValue)).toBeCloseTo(1.58496, 5);
      expect(r.items[0]).toMatchObject({ value: freshValue, tie: false });
    }
  });

  it("rule 4: a copy cycle at share 1 counts both claims 0", () => {
    // s1 copies s2 and s2 copies s1, both say a. Evaluating s1 reaches s2, which reaches s1 again;
    // the in-progress s1 counts as 1, so s2 = (1 - 1) * 1 = 0, then s1 = (1 - 1) * 0 = 0.
    // C(a) = 0; s3 says b with C(b) = 1.58496, so P(b) = 2^1.58496 / (1 + 2^1.58496) = 3 / 4.
    const claims = [claim("c1", "s1", "a", 1), claim("c2", "s2", "a", 1), claim("c3", "s3", "b", 1)];
    const copies = [
      { copier: "s1", original: "s2", share: 1 },
      { copier: "s2", original: "s1", share: 1 },
    ];
    const r = resolveClaims({ sources: wiki, claims, copies }, { now: 10 });
    expect(score(r, "a")).toBe(0);
    expect(r.items[0]).toMatchObject({ value: "b", confidence: expect.closeTo(0.75, 10) });
  });
});
