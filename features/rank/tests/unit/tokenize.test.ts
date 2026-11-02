import { describe, expect, it } from "vitest";
import { indexText, queryTerms, tokenize } from "../../src/text/tokenize.js";

describe("tokenize", () => {
  it("lower-cases and splits on punctuation", () => {
    expect(tokenize("Hello, World! v2.0")).toEqual(["hello", "world", "v2", "0"]);
  });
  it("keeps letters of any script and combining marks together", () => {
    expect(tokenize("日本語 Привет हिन्दी")).toEqual(["日本語", "привет", "हिन्दी"]);
  });
  it("normalizes to NFC so composed and decomposed forms match", () => {
    expect(tokenize("école")).toEqual(tokenize("école"));
  });
  it("returns nothing for empty and punctuation-only input", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize(' "*-() ')).toEqual([]);
  });
  it("treats FTS5 operators as plain separators", () => {
    expect(tokenize('NEAR(a b) "x" * OR -y')).toEqual(["near", "a", "b", "x", "or", "y"]);
  });
});

describe("indexText", () => {
  it("hex-encodes each token as UTF-8, space separated", () => {
    expect(indexText("é ab")).toBe("c3a9 6162");
  });
  it("is empty for empty text", () => {
    expect(indexText("")).toBe("");
  });
});

describe("queryTerms", () => {
  it("returns distinct encoded terms in first-seen order", () => {
    expect(queryTerms("b a b a")).toEqual(["62", "61"]);
  });
  it("keeps at most 32 distinct terms", () => {
    const q = Array.from({ length: 50 }, (_, i) => `w${i}`).join(" ");
    const terms = queryTerms(q);
    expect(terms).toHaveLength(32);
    expect(terms[0]).toBe(indexText("w0"));
    expect(terms[31]).toBe(indexText("w31"));
  });
  it("reads only the first 10000 characters", () => {
    expect(queryTerms(`${"a ".repeat(5000)}zzz`)).toEqual(["61"]);
    expect(queryTerms(`${"a".repeat(9999)} zzz`)).toEqual([indexText("a".repeat(9999))]);
    expect(queryTerms(`${"a".repeat(9998)} zzz`)).toEqual([indexText("a".repeat(9998)), indexText("z")]);
  });
});
