import { describe, expect, it } from "vitest";
import type { Source } from "../../../src/index.js";
import { prepare } from "../../../src/input/prepare.js";

const sources: Source[] = [
  { id: "s3", class: "wiki" },
  { id: "s1", class: "signed" },
  { id: "s2", class: "chat" },
];
const claim = (id: string, source: string, item: string, value: string, at: number) => ({ id, source, item, value, at });
const input = {
  sources,
  claims: [claim("c1", "s3", "x", "a", 14), claim("c2", "s2", "x", "a", 14), claim("c3", "s1", "x", "b", 4), claim("c4", "s1", "w", "z", 4)],
  copies: [{ copier: "s3", original: "s2", share: 0.4 }],
  corrections: [{ item: "x", value: "c", at: 20 }],
};

describe("input/prepare", () => {
  const model = prepare(input, { now: 14, halfLifeMs: 10, priors: { wiki: 0.6 } });

  it("rules 7, 10: sources sorted by id, priors by class with overrides, claim counts per source", () => {
    expect(model.sourceIds).toEqual(["s1", "s2", "s3"]);
    expect(model.priors).toEqual([0.95, 0.5, 0.6]); // signed default, chat default, wiki overridden
    expect(model.counts).toEqual([2, 1, 1]); // s1 claims x and w
  });

  it("rules 2, 10, 17: items sorted by id, values sorted, n false values, corrected index", () => {
    expect(model.items.map((i) => i.item)).toEqual(["w", "x"]);
    expect(model.items[0]).toMatchObject({ values: ["z"], n: 1, corrected: -1, correctedAt: 0 }); // n = max(1, 1 - 1)
    // x: values a, b plus the unclaimed correction c; n = 3 - 1 = 2; c is index 2.
    expect(model.items[1]).toMatchObject({ values: ["a", "b", "c"], n: 2, corrected: 2, correctedAt: 20 });
  });

  it("rules 4, 5: factor = copy x decay, claims sorted by source index", () => {
    // s1 b at 4: age 10 = one half life, 0.5. s2 a at 14: age 0, 1. s3 a at 14 copies s2 at
    // share 0.4: (1 - 0.4) * s2's factor 1 = 0.6, times decay 1.
    expect(model.items[1]!.claims).toEqual([
      { source: 0, group: 1, factor: 0.5, at: 4 },
      { source: 1, group: 0, factor: 1, at: 14 },
      { source: 2, group: 0, factor: 0.6, at: 14 },
    ]);
  });
});
