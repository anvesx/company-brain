import { describe, expect, it } from "vitest";
import { resolveClaims } from "../../../src/index.js";
import { expectBadInput, put, type Row, validCall } from "./cases.js";

// Rule 12, string, id and reference rows. One row per rejected case.
const notObject = (list: string) => (call: Parameters<Row[1]>[0]) => {
  call.input[list]![0] = 7;
};
const rows: Row[] = [
  ["source not an object", notObject("sources"), "sources[0]"],
  ["claim not an object", notObject("claims"), "claims[0]"],
  ["sources not an array", (call) => Reflect.set(call.input, "sources", "x"), "sources"],
  ["claims not an array", (call) => Reflect.set(call.input, "claims", {}), "claims"],
  ["source id empty", put("sources", 0, "id", ""), "sources[0].id"],
  ["source id not a string", put("sources", 0, "id", 7), "sources[0].id"],
  ["claim id empty", put("claims", 0, "id", ""), "claims[0].id"],
  ["claim id not a string", put("claims", 1, "id", null), "claims[1].id"],
  ["claim source empty", put("claims", 0, "source", ""), "claims[0].source"],
  ["claim item empty", put("claims", 0, "item", ""), "claims[0].item"],
  ["claim item not a string", put("claims", 0, "item", 3), "claims[0].item"],
  ["claim value empty", put("claims", 1, "value", ""), "claims[1].value"],
  ["claim value not a string", put("claims", 1, "value", {}), "claims[1].value"],
  // "é" is 2 bytes in UTF-8: 2049 of them = 4098 bytes > 4096, though only 2049 chars.
  ["claim value over 4096 UTF-8 bytes", put("claims", 0, "value", "é".repeat(2049)), "claims[0].value"],
  ["correction item empty", put("corrections", 0, "item", ""), "corrections[0].item"],
  ["correction value empty", put("corrections", 0, "value", ""), "corrections[0].value"],
  ["claim id duplicated", put("claims", 1, "id", "c1"), "claims[1].id"],
  ["source id duplicated", put("sources", 1, "id", "s1"), "sources[1].id"],
  ["claim names unknown source", put("claims", 0, "source", "nobody"), "claims[0].source"],
  ["correction names unknown item", put("corrections", 0, "item", "nothing"), "corrections[0].item"],
  ["copy edge copier equals original", put("copies", 0, "original", "s2"), "copies[0].original"],
  ["copy edge unknown copier", put("copies", 0, "copier", "ghost"), "copies[0].copier"],
  ["copy edge unknown original", put("copies", 0, "original", "ghost"), "copies[0].original"],
  ["copy edge share above 1", put("copies", 0, "share", 1.5), "copies[0].share"],
  ["copy edge share a string", put("copies", 0, "share", "0.5"), "copies[0].share"],
  ["copy edge not an object", notObject("copies"), "copies[0]"],
  ["correction not an object", notObject("corrections"), "corrections[0]"],
  ["copy edge copier empty", put("copies", 0, "copier", ""), "copies[0].copier"],
  ["copy edge original empty", put("copies", 0, "original", ""), "copies[0].original"],
  ["copy edge share below 0", put("copies", 0, "share", -0.1), "copies[0].share"],
];

// forEach skips holes, so a sparse list once slipped past rule 12. Two hole shapes per list.
const holes: Array<[string, (list: unknown[]) => void]> = [
  ["a hole at index 0", (list) => delete list[0]],
  // Empty the list, then grow its length: the new slots are holes, not undefined values.
  ["a hole in a fresh Array(2)", (list) => Reflect.set(list, "length", 0) && Reflect.set(list, "length", 2)],
];

describe("input/validate sparse lists", () => {
  describe.each(["sources", "claims", "copies", "corrections"])("%s", (name) => {
    it.each(holes)(`rule 12: %s names ${name}[0]`, (_label, makeHole) => {
      expectBadInput((call) => makeHole(call.input[name]!), `${name}[0]`);
    });
  });
});

describe("input/validate strings and references", () => {
  it.each(rows)("rule 12: %s", (_label, breakIt, field) => {
    expectBadInput(breakIt, field);
  });

  it("rule 12: a value of exactly 4096 UTF-8 bytes is accepted", () => {
    const call = validCall();
    put("claims", 0, "value", "a".repeat(4096))(call);
    expect(() => resolveClaims(call.input as never, call.options as never)).not.toThrow();
  });

  it("rule 12: share 0 and share 1 are inside [0, 1] and accepted", () => {
    for (const share of [0, 1]) {
      const call = validCall();
      put("copies", 0, "share", share)(call);
      expect(() => resolveClaims(call.input as never, call.options as never)).not.toThrow();
    }
  });
});
