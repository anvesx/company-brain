import { describe, expect, it } from "vitest";
import { contentHash } from "../../src/index.js";

describe("contentHash", () => {
  it("hashes unicode and the empty string to known sha256 digests", () => {
    expect(contentHash("文档")).toBe("2687ccdbb1d2288a8c7867ab8a17e3a70eade5d774aafd0d7eb7b12cbf8165cd");
    expect(contentHash("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("is deterministic and sensitive to one character", () => {
    expect(contentHash("a")).toBe(contentHash("a"));
    expect(contentHash("a")).not.toBe(contentHash("b"));
    expect(contentHash("a")).toMatch(/^[0-9a-f]{64}$/);
  });
});
