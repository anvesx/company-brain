import { describe, expect, it } from "vitest";
import { resolveClaims, type Source } from "../../../src/index.js";

const sources: Source[] = [
  { id: "s1", class: "wiki" },
  { id: "s2", class: "wiki" },
];
const claims = [
  { id: "c1", source: "s1", item: "x1", value: "a", at: 1 },
  { id: "c2", source: "s2", item: "x1", value: "b", at: 1 },
  { id: "c3", source: "s1", item: "x2", value: "c", at: 1 },
];
const accuracy = (r: ReturnType<typeof resolveClaims>, id: string) => r.sources.find((s) => s.source === id)!.accuracy;

describe("rules: corrections", () => {
  it("rule 9: a correction lowers the wrong source's accuracy and raises the right one's", () => {
    const corrections = [{ item: "x1", value: "b", at: 5 }];
    const r = resolveClaims({ sources, claims, corrections }, { now: 10, minClaims: 1 });
    // P(b) on x1 is pinned to 1, P(a) to 0. x2 has one value, so P(c) = 1.
    // A(s1) = (0 + 1) / 2 = 0.5 < prior 0.75. A(s2) = 1, clamped to 0.99 > 0.75.
    expect(accuracy(r, "s1")).toBeCloseTo(0.5, 10);
    expect(accuracy(r, "s2")).toBe(0.99);
    expect(r.items[0]).toMatchObject({ item: "x1", value: "b", confidence: 1, corrected: true });
    expect(r.items[0]!.groups.map((g) => g.value).sort()).toEqual(["a", "b"]);
    expect(r.items[1]).toMatchObject({ item: "x2", corrected: false });
  });

  it("rule 9: the newest correction per item wins", () => {
    const corrections = [
      { item: "x1", value: "b", at: 9 },
      { item: "x1", value: "a", at: 5 },
    ];
    const r = resolveClaims({ sources, claims, corrections }, { now: 10, minClaims: 1 });
    expect(r.items[0]).toMatchObject({ value: "b", corrected: true });
  });

  it("rule 7: a source whose every claim is wrong clamps to 0.01", () => {
    const corrections = [{ item: "x1", value: "a", at: 5 }];
    const r = resolveClaims({ sources, claims, corrections }, { now: 10, minClaims: 1 });
    // A(s2) = mean of P(b) = 0, clamped to 0.01.
    expect(accuracy(r, "s2")).toBe(0.01);
  });
});

describe("rules: corrections, unclaimed value", () => {
  it("rule 17: a corrected value nobody claimed is a group with no sources and newestAt equal to the correction's at", () => {
    const r = resolveClaims({ sources, claims, corrections: [{ item: "x1", value: "z", at: 7 }] }, { now: 10 });
    const group = r.items[0]!.groups.find((g) => g.value === "z");
    expect(group).toMatchObject({ sources: [], newestAt: 7 });
    expect(r.items[0]).toMatchObject({ value: "z", confidence: 1, corrected: true });
  });
});
