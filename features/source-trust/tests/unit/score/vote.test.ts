import { describe, expect, it } from "vitest";
import { resolveClaims, type Source } from "../../../src/index.js";

const claim = (id: string, source: string, value: string, at = 1) => ({ id, source, item: "x", value, at });
const groupOf = (r: ReturnType<typeof resolveClaims>, value: string) => r.items[0]!.groups.find((g) => g.value === value)!;

// Rules 2 and 3 through the public API. Every source has under minClaims (5) claims, so all
// accuracies stay at the class priors: wiki 0.75, chat 0.5, draft 0.4.
describe("score/vote", () => {
  it("rule 3: P(v) equals the Eq 4 product form on a hand-built three-value item", () => {
    const sources: Source[] = [
      { id: "s1", class: "wiki" },
      { id: "s2", class: "wiki" },
      { id: "s3", class: "chat" },
      { id: "s4", class: "chat" },
    ];
    const claims = [claim("c1", "s1", "a"), claim("c2", "s2", "a"), claim("c3", "s3", "b"), claim("c4", "s4", "c")];
    const r = resolveClaims({ sources, claims }, { now: 10 });
    // n = 3 values - 1 = 2. wiki: 2 * 0.75 / 0.25 = 6. chat: 2 * 0.5 / 0.5 = 2.
    // Product form: a = 6 * 6 = 36, b = 2, c = 2, sum 40. P(a) = 0.9, P(b) = P(c) = 0.05.
    expect(groupOf(r, "a").confidence).toBeCloseTo(0.9, 10);
    expect(groupOf(r, "b").confidence).toBeCloseTo(0.05, 10);
    expect(groupOf(r, "c").confidence).toBeCloseTo(0.05, 10);
    // Confidence score is log2 of the product: C(a) = log2(36) = 5.1699, C(b) = log2(2) = 1.
    expect(groupOf(r, "a").score).toBeCloseTo(Math.log2(36), 10);
    expect(groupOf(r, "b").score).toBeCloseTo(1, 10);
    expect(r.items[0]!.confidence).toBeCloseTo(0.9, 10);
  });

  it("rule 2: a source below 1 / (1 + n) votes against its own value", () => {
    const sources: Source[] = [
      { id: "s1", class: "draft" },
      { id: "s2", class: "chat" },
    ];
    const r = resolveClaims({ sources, claims: [claim("c1", "s1", "a"), claim("c2", "s2", "b")] }, { now: 10 });
    // n = 1. C(a) = log2(0.4 / 0.6) = -0.585, C(b) = log2(1) = 0.
    // P(b) = 1 / (1 + 2^-0.585) = 1 / (1 + 0.6667) = 0.6.
    expect(r.items[0]!.value).toBe("b");
    expect(groupOf(r, "a").score).toBeCloseTo(-0.585, 3);
    expect(r.items[0]!.confidence).toBeCloseTo(0.6, 10);
  });

  it("rule 3: max subtraction keeps confidence finite when 2^C overflows", () => {
    const sources: Source[] = Array.from({ length: 301 }, (_, i) => ({ id: `s${i}`, class: i === 300 ? "chat" : "signed" }));
    const claims = sources.map((s, i) => claim(`c${i}`, s.id, i === 300 ? "b" : "a"));
    const r = resolveClaims({ sources, claims }, { now: 10 });
    // C(a) = 300 * log2(19) = 1274.4, and 2^1274 is Infinity in doubles. P(a) must still be 1.
    expect(Number.isFinite(groupOf(r, "a").confidence)).toBe(true);
    expect(groupOf(r, "a").confidence).toBeCloseTo(1, 10);
    expect(groupOf(r, "b").confidence).toBeGreaterThanOrEqual(0);
  });
});
