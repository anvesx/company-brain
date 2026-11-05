import { describe, expect, it } from "vitest";
import { resolveClaims, type Source } from "../../../src/index.js";

const score = (r: ReturnType<typeof resolveClaims>, value: string) => r.items[0]!.groups.find((g) => g.value === value)!.score;

describe("resolve: decay factor", () => {
  it("rule 5: decay cannot flip a vote; an old signed claim still beats a fresh chat claim", () => {
    const sources: Source[] = [
      { id: "s1", class: "signed" },
      { id: "s2", class: "chat" },
    ];
    const claims = [
      { id: "c1", source: "s1", item: "x", value: "a", at: 0 },
      { id: "c2", source: "s2", item: "x", value: "b", at: 100_000 },
    ];
    const r = resolveClaims({ sources, claims }, { now: 100_000, halfLifeMs: 1000 });
    // Age 100000 at half life 1000: 0.5^100 is below the floor, so the factor is 0.1.
    // C(a) = 0.1 * log2(19) = 0.42479 > C(b) = 0 (chat weight 0, fresh factor 1).
    expect(score(r, "a")).toBeCloseTo(0.42479, 5);
    expect(r.items[0]!.value).toBe("a");
  });

  it("rule 5: age lowers the magnitude, never the sign, of a negative vote", () => {
    const sources: Source[] = [
      { id: "s1", class: "draft" },
      { id: "s2", class: "chat" },
    ];
    const claims = [
      { id: "c1", source: "s1", item: "x", value: "a", at: 0 },
      { id: "c2", source: "s2", item: "x", value: "b", at: 1000 },
    ];
    // draft log2(0.4 / 0.6) = -0.585. Factor 0.1: -0.0585, still below chat's 0.
    const old = resolveClaims({ sources, claims }, { now: 1_000_000, halfLifeMs: 1 });
    expect(score(old, "a")).toBeCloseTo(-0.0585, 4);
    expect(old.items[0]!.value).toBe("b");
  });

  it("rule 5: one half life halves the weight; no halfLifeMs means factor 1", () => {
    const sources: Source[] = [{ id: "s1", class: "signed" }];
    const claims = [{ id: "c1", source: "s1", item: "x", value: "a", at: 0 }];
    // Age 1000 at half life 1000: 0.5^1 = 0.5. C(a) = 0.5 * log2(19) = 2.1240 (n = 1).
    expect(score(resolveClaims({ sources, claims }, { now: 1000, halfLifeMs: 1000 }), "a")).toBeCloseTo(2.124, 3);
    expect(score(resolveClaims({ sources, claims }, { now: 1000 }), "a")).toBeCloseTo(Math.log2(19), 10);
  });
});
