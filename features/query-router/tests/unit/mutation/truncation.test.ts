import { describe, expect, it } from "vitest";
import { route } from "../../../src/index.js";
import { truncateQuestion } from "../../../src/signals.js";

describe("UTF-8 truncation", () => {
  it("keeps an unpaired surrogate when input is within the limit", () => {
    expect(truncateQuestion("\ud800")).toBe("\ud800");
  });

  it("removes a code point split by the byte boundary", () => {
    const prefix = "x".repeat(4094);
    expect(truncateQuestion(`${prefix}😀who`)).toBe(prefix);
  });

  it("treats a non-string runtime value as empty", () => {
    const invalid = 42 as unknown as string;
    const context = { sources: ["slack"], hasGraph: true, hasRag: true };
    expect(route(invalid, context)).toEqual({ mode: "none" });
  });
});
