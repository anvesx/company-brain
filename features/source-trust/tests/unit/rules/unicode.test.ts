import { describe, expect, it } from "vitest";
import { resolveClaims, type Source } from "../../../src/index.js";

const sources: Source[] = [
  { id: "s1", class: "wiki" },
  { id: "s2", class: "wiki" },
];
const claim = (id: string, source: string, value: string) => ({ id, source, item: "x", value, at: 1 });

describe("rules: unicode and edge inputs", () => {
  it("rule 13: NFC merges composed and decomposed é into one value", () => {
    const composed = "café";
    const decomposed = "café";
    const r = resolveClaims({ sources, claims: [claim("c1", "s1", composed), claim("c2", "s2", decomposed)] }, { now: 10 });
    expect(r.items[0]!.groups).toHaveLength(1);
    expect(r.items[0]!.groups[0]).toMatchObject({ value: composed, sources: ["s1", "s2"] });
    expect(r.items[0]!.value).toBe(composed);
  });

  it("rule 13: case is significant", () => {
    const r = resolveClaims({ sources, claims: [claim("c1", "s1", "Alice"), claim("c2", "s2", "alice")] }, { now: 10 });
    expect(r.items[0]!.groups.map((g) => g.value)).toEqual(["Alice", "alice"]);
  });

  it("rule 15: empty claims keep every source at its prior", () => {
    const r = resolveClaims({ sources, claims: [] }, { now: 0, priors: { wiki: 0.7 } });
    expect(r).toEqual({
      sources: [
        { source: "s1", accuracy: 0.7, claims: 0, learned: false },
        { source: "s2", accuracy: 0.7, claims: 0, learned: false },
      ],
      items: [],
      rounds: 0,
      converged: true,
    });
  });

  it("rule 12: one bad claim among good ones fails the whole call", () => {
    const claims = [claim("c1", "s1", "a"), claim("c2", "s2", "")];
    expect(() => resolveClaims({ sources, claims }, { now: 10 })).toThrow(/claims\[1\]\.value/);
  });
});
