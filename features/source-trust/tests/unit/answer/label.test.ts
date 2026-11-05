import { describe, expect, it } from "vitest";
import { labelPassages, resolveClaims, type Source, TrustError } from "../../../src/index.js";

const sources: Source[] = [
  { id: "s1", class: "signed" },
  { id: "s2", class: "chat" },
];
const claims = [
  { id: "c1", source: "s1", item: "x", value: "a", at: 1 },
  { id: "c2", source: "s2", item: "x", value: "b", at: 2 },
];
const result = resolveClaims({ sources, claims }, { now: 10 });

describe("answer/label", () => {
  it("rule 11: best, other and unresolved, with trust equal to the source accuracy", () => {
    const passages = [
      { source: "s1", item: "x", value: "a", text: "owner is a" },
      { source: "s2", item: "x", value: "b", text: "owner is b" },
      { source: "s1", text: "no item named" },
      { source: "s2", item: "unknown", value: "a", text: "item not resolved" },
    ];
    // Accuracies stay at priors (2 claims < minClaims 5): signed 0.95, chat 0.5.
    expect(labelPassages(passages, result)).toEqual([
      { source: "s1", item: "x", value: "a", text: "owner is a", trust: 0.95, group: "best" },
      { source: "s2", item: "x", value: "b", text: "owner is b", trust: 0.5, group: "other" },
      { source: "s1", text: "no item named", trust: 0.95, group: "unresolved" },
      { source: "s2", item: "unknown", value: "a", text: "item not resolved", trust: 0.5, group: "unresolved" },
    ]);
  });

  it("rule 11: a result item whose winner is null labels its passages unresolved, keeping trust", () => {
    const noWinner = { ...result, items: [{ ...result.items[0]!, value: null }] };
    const passages = [{ source: "s1", item: "x", value: "a" }];
    expect(labelPassages(passages, noWinner)).toEqual([{ source: "s1", item: "x", value: "a", trust: 0.95, group: "unresolved" }]);
  });

  it("rule 11: output length equals input length, duplicates included, none dropped", () => {
    const passages = Array.from({ length: 7 }, () => ({ source: "s2", item: "x", value: "b" }));
    expect(labelPassages(passages, result)).toHaveLength(7);
    expect(labelPassages([], result)).toEqual([]);
  });

  it("rule 10: labelPassages does not mutate its passages", () => {
    const passages = [{ source: "s1", item: "x", value: "a" }];
    const snapshot = structuredClone(passages);
    labelPassages(passages, result);
    expect(passages).toEqual(snapshot);
  });

  it("rule 12: a non-array passages argument raises BAD_INPUT naming passages", () => {
    let caught: unknown;
    try {
      labelPassages(null as never, result);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(TrustError);
    expect([(caught as TrustError).code, (caught as TrustError).field]).toEqual(["BAD_INPUT", "passages"]);
  });
});
