import { describe, expect, it } from "vitest";
import { labelPassages, resolveClaims, TrustError } from "../../../src/index.js";

const result = resolveClaims({ sources: [{ id: "s1", class: "signed" }], claims: [{ id: "c1", source: "s1", item: "x", value: "a", at: 1 }] }, { now: 10 });

/** A sparse array: a hole at index 0, then `rest`. forEach would skip the hole. */
const gap = (...rest: unknown[]): unknown[] => Object.assign(new Array<unknown>(rest.length + 1), Object.fromEntries(rest.map((v, i) => [i + 1, v])));

const fieldOf = (passages: unknown, res: unknown): string => {
  try {
    labelPassages(passages as never, res as never);
  } catch (error) {
    expect(error).toBeInstanceOf(TrustError);
    expect((error as TrustError).code).toBe("BAD_INPUT");
    expect((error as TrustError).message).toMatch(/^[^:]+: \S/);
    return (error as TrustError).field;
  }
  throw new Error("labelPassages did not throw");
};

describe("answer/label input", () => {
  it("rule 12: a null passage names passages[0], not a raw TypeError", () => {
    expect(fieldOf([null], result)).toBe("passages[0]");
  });

  it("rule 12: a non-array passages names passages and says why", () => {
    expect(fieldOf("abc", result)).toBe("passages");
  });

  it("rule 12: a null result names result", () => {
    expect(fieldOf([{ source: "s1" }], null)).toBe("result");
  });

  it("rule 12: a passage without a string source names passages[1].source", () => {
    expect(fieldOf([{ source: "s1" }, { source: 4 }], result)).toBe("passages[1].source");
  });

  it("rule 12: a non-string item or value names that field", () => {
    expect(fieldOf([{ source: "s1", item: 3 }], result)).toBe("passages[0].item");
    expect(fieldOf([{ source: "s1", value: {} }], result)).toBe("passages[0].value");
  });

  it("rule 12: a result without sources or items arrays names result.sources or result.items", () => {
    expect(fieldOf([], { ...result, sources: null })).toBe("result.sources");
    expect(fieldOf([], { ...result, items: "x" })).toBe("result.items");
  });

  it("rule 12: a null or non-object result entry names result.sources[i] or result.items[i]", () => {
    expect(fieldOf([], { ...result, sources: [null] })).toBe("result.sources[0]");
    expect(fieldOf([], { ...result, sources: [result.sources[0], 5] })).toBe("result.sources[1]");
    expect(fieldOf([], { ...result, items: [null] })).toBe("result.items[0]");
    expect(fieldOf([], { ...result, items: [result.items[0], "x"] })).toBe("result.items[1]");
  });

  it("rule 12: a result entry without a string source or item names that field", () => {
    expect(fieldOf([], { ...result, sources: [{ accuracy: 0.5 }] })).toBe("result.sources[0].source");
    expect(fieldOf([], { ...result, items: [{ value: "a" }] })).toBe("result.items[0].item");
  });

  it("rule 12: a source accuracy that is not a finite number names result.sources[i].accuracy", () => {
    for (const accuracy of [undefined, "0.5", null, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(fieldOf([], { ...result, sources: [result.sources[0], { source: "s2", accuracy }] })).toBe("result.sources[1].accuracy");
    }
  });

  it("rule 12: a hole in passages, result.sources or result.items names that index", () => {
    expect(fieldOf(gap({ source: "s1" }), result)).toBe("passages[0]");
    expect(fieldOf(new Array(2), result)).toBe("passages[0]");
    expect(fieldOf([], { ...result, sources: gap(result.sources[0]) })).toBe("result.sources[0]");
    expect(fieldOf([], { ...result, items: new Array(2) })).toBe("result.items[0]");
  });

  it("rule 12: a result item whose value is not a string names result.items[i].value", () => {
    expect(fieldOf([], { ...result, items: [{ item: "x", value: 5 }] })).toBe("result.items[0].value");
    expect(fieldOf([], { ...result, items: [result.items[0], { item: "y" }] })).toBe("result.items[1].value");
  });
});
