import { describe, expect, it } from "vitest";
import { labelPassages, resolveClaims, type Source } from "../../../src/index.js";

// Rules 16 to 18: the cases the first red suite left open, now pinned in the spec.
const sources: Source[] = [
  { id: "s1", class: "wiki" },
  { id: "s2", class: "wiki" },
];

describe("rules 16 to 18: pinned edge cases", () => {
  it("rule 16: only the newest claim by one source on one item counts", () => {
    const claims = [
      { id: "old", source: "s1", item: "x", value: "a", at: 1 },
      { id: "new", source: "s1", item: "x", value: "b", at: 2 },
      { id: "c2", source: "s2", item: "x", value: "a", at: 1 },
    ];
    const r = resolveClaims({ sources, claims }, { now: 3, minClaims: 1 });
    // s1 votes b (its newest), s2 votes a: a tie on equal priors, so groups sort by value (a first)
    // and the newest claim decides the winner, so b.
    const x = r.items[0]!;
    expect(x.groups.map((g) => g.sources)).toEqual([["s2"], ["s1"]]);
    expect(x.value).toBe("b");
  });

  it("rule 16: items come back sorted by id", () => {
    const claims = [
      { id: "c1", source: "s1", item: "zeta", value: "a", at: 1 },
      { id: "c2", source: "s1", item: "alpha", value: "a", at: 1 },
      { id: "c3", source: "s2", item: "mid", value: "a", at: 1 },
    ];
    const r = resolveClaims({ sources, claims }, { now: 1 });
    expect(r.items.map((i) => i.item)).toEqual(["alpha", "mid", "zeta"]);
  });

  it("rule 17: a corrected value nobody claimed becomes its own group with no sources", () => {
    const claims = [{ id: "c1", source: "s1", item: "x", value: "a", at: 1 }];
    const corrections = [{ item: "x", value: "z", at: 2 }];
    const r = resolveClaims({ sources, claims, corrections }, { now: 3, minClaims: 1 });
    const x = r.items[0]!;
    expect(x).toMatchObject({ value: "z", corrected: true, confidence: 1 });
    expect(x.groups[0]).toMatchObject({ value: "z", sources: [], confidence: 1 });
    expect(x.groups.find((g) => g.value === "a")?.confidence).toBe(0);
  });

  it("rule 17: two corrections at the same time pick the smaller value", () => {
    const claims = [{ id: "c1", source: "s1", item: "x", value: "a", at: 1 }];
    const corrections = [
      { item: "x", value: "q", at: 2 },
      { item: "x", value: "b", at: 2 },
    ];
    const r = resolveClaims({ sources, claims, corrections }, { now: 3, minClaims: 1 });
    expect(r.items[0]!.value).toBe("b");
  });

  it("rule 18: unmatched value is other, unknown source is unresolved with trust 0", () => {
    const claims = [
      { id: "c1", source: "s1", item: "x", value: "a", at: 1 },
      { id: "c2", source: "s2", item: "x", value: "a", at: 1 },
    ];
    const r = resolveClaims({ sources, claims }, { now: 1 });
    const out = labelPassages(
      [
        { source: "s1", item: "x", value: "never claimed" },
        { source: "ghost", item: "x", value: "a" },
      ],
      r,
    );
    expect(out[0]).toMatchObject({ group: "other", trust: 0.75 });
    expect(out[1]).toMatchObject({ group: "unresolved", trust: 0 });
  });
});
