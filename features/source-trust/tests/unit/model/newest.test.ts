import { describe, expect, it } from "vitest";
import { edgesByCopier, newestClaims, newestCorrections } from "../../../src/input/newest.js";

const index = new Map([["s1", 0]]);
const claim = (id: string, value: string, at: number) => ({ id, source: "s1", item: "x", value, at });
const kept = (claims: ReturnType<typeof claim>[]) => newestClaims(claims, index).get("x")!.get(0)!;

describe("input/newest", () => {
  it("rule 16: the claim with the larger at wins, whatever the input order", () => {
    // at 9 beats at 5 in both orders, so the winner is c2 (value "b") each time.
    expect(kept([claim("c1", "a", 5), claim("c2", "b", 9)]).id).toBe("c2");
    expect(kept([claim("c2", "b", 9), claim("c1", "a", 5)]).id).toBe("c2");
  });

  it("rule 16: equal at falls back to the larger claim id, not to input order", () => {
    // Code-unit order: "c9" > "c10" because "9" > "1", so c9 wins in both input orders.
    // A `>=` on at would let the later input win and flip the second line.
    expect(kept([claim("c10", "a", 5), claim("c9", "b", 5)]).id).toBe("c9");
    expect(kept([claim("c9", "b", 5), claim("c10", "a", 5)]).id).toBe("c9");
  });

  it("rule 16: the id compare is strict, so the same id and time keeps the first claim", () => {
    // Ids are unique after validation; called directly with a duplicate, `>=` would replace "a" by "b".
    expect(kept([claim("c1", "a", 5), claim("c1", "b", 5)]).value).toBe("a");
  });
});

const fix = (value: string, at: number) => ({ item: "x", value, at });
const winner = (corrections: ReturnType<typeof fix>[]) => newestCorrections(corrections).get("x")!;

describe("input/newest corrections", () => {
  it("rule 9: the correction with the larger at wins, whatever the input order", () => {
    expect(winner([fix("a", 5), fix("b", 9)])).toEqual(fix("b", 9));
    expect(winner([fix("b", 9), fix("a", 5)])).toEqual(fix("b", 9));
  });

  it("rule 17: equal at picks the lexicographically smaller value, whatever the input order", () => {
    expect(winner([fix("a", 5), fix("b", 5)]).value).toBe("a");
    expect(winner([fix("b", 5), fix("a", 5)]).value).toBe("a");
  });

  it("rule 17: values compare after NFC, so decomposed e + U+0301 (composed U+00E9) is larger than g", () => {
    expect(winner([fix("e\u0301", 5), fix("g", 5)]).value).toBe("g");
  });
});

describe("input/newest edges", () => {
  const ids = new Map([
    ["s1", 1],
    ["s2", 2],
    ["s3", 3],
  ]);
  const edge = (original: string) => ({ copier: "s1", original, share: 0.5 });
  const originals = (copies: ReturnType<typeof edge>[]) =>
    edgesByCopier(copies, ids)
      .get(1)!
      .map((e) => e.original);

  it("rule 4: one copier's edges are sorted by original index, whatever the input order", () => {
    expect(originals([edge("s2"), edge("s3")])).toEqual([2, 3]);
    expect(originals([edge("s3"), edge("s2")])).toEqual([2, 3]);
  });
});
