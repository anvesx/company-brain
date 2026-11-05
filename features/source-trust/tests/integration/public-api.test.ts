import { describe, expect, it } from "vitest";
import { labelPassages, resolveClaims, type Source, TrustError, type TrustResult } from "../../src/index.js";

const sources: Source[] = [
  { id: "handbook", class: "signed" },
  { id: "slack", class: "chat" },
];
const claims = [
  { id: "c1", source: "handbook", item: "owner:payments", value: "Priya", at: 1_000 },
  { id: "c2", source: "slack", item: "owner:payments", value: "Sam", at: 2_000 },
];

describe("public API", () => {
  it("resolves a conflict and labels passages through the package entry", () => {
    const result: TrustResult = resolveClaims({ sources, claims }, { now: 3_000 });
    // n = 1: signed log2(19), chat 0. P(Priya) = 19 / 20 = 0.95.
    expect(result.items[0]).toMatchObject({ item: "owner:payments", value: "Priya", confidence: expect.closeTo(0.95, 10) });
    const passages = [
      { source: "slack", item: "owner:payments", value: "Sam", text: "Sam owns payments now" },
      { source: "handbook", item: "owner:payments", value: "Priya", text: "Owner: Priya" },
    ];
    expect(labelPassages(passages, result).map((p) => [p.group, p.trust])).toEqual([
      ["other", 0.5],
      ["best", 0.95],
    ]);
  });

  it("raises TrustError BAD_INPUT naming the field", () => {
    const bad = [{ ...claims[0]!, source: "nobody" }];
    try {
      resolveClaims({ sources, claims: bad }, { now: 3_000 });
      expect.unreachable("resolveClaims accepted an unknown source");
    } catch (error) {
      expect(error).toBeInstanceOf(TrustError);
      expect(error).toMatchObject({ code: "BAD_INPUT", field: "claims[0].source" });
    }
  });
});
