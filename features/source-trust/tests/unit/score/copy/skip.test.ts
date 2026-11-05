import { describe, expect, it } from "vitest";
import { resolveClaims } from "../../../../src/index.js";

describe("score/copy skipped edges", () => {
  it("rule 4: an edge to a source with another value is skipped and the later edge still counts", () => {
    // s0 says "a", s1 and s2 say "b"; s2 copies s0 (share 0.4, other value, skipped) and s1 (share 0.5).
    // Edges sort by original index, so the skipped s0 edge comes first. The walk must go on to
    // the s1 edge: factor(s2) = (1 - 0.5) * factor(s1) = 0.5 * 1 = 0.5. Stopping at the skipped edge gives 1.
    // n = 1 (two values), wiki weight log2(0.75 / 0.25) = log2 3, so C(b) = log2(3) * (1 + 0.5).
    const sources = ["s0", "s1", "s2"].map((id) => ({ id, class: "wiki" as const }));
    const claims = [
      { id: "c0", source: "s0", item: "x", value: "a", at: 1 },
      { id: "c1", source: "s1", item: "x", value: "b", at: 1 },
      { id: "c2", source: "s2", item: "x", value: "b", at: 1 },
    ];
    const copies = [
      { copier: "s2", original: "s0", share: 0.4 },
      { copier: "s2", original: "s1", share: 0.5 },
    ];
    const groups = resolveClaims({ sources, claims, copies }, { now: 2 }).items[0]!.groups;
    expect(groups.find((g) => g.value === "b")!.score).toBeCloseTo(Math.log2(3) * 1.5, 12);
  });
});
