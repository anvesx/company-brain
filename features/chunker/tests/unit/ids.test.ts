import { describe, expect, it } from "vitest";
import { chunkId } from "../../src/ids.js";

describe("chunkId", () => {
  it("equals sha256 of docId, index and text joined by colons", () => {
    expect(chunkId("doc", 0, "abc")).toBe("cb82a90de13b60993e1be80ce71f27e4bf94312983c3bc0f7704b99a6a0c8f44");
  });
  it("is 64 lowercase hex characters", () => {
    expect(chunkId("d", 3, "text")).toMatch(/^[0-9a-f]{64}$/);
  });
  it("is deterministic", () => {
    expect(chunkId("d", 3, "text")).toBe(chunkId("d", 3, "text"));
  });
  it("changes when the docId, index or text changes", () => {
    const base = chunkId("d", 3, "text");
    expect(chunkId("e", 3, "text")).not.toBe(base);
    expect(chunkId("d", 4, "text")).not.toBe(base);
    expect(chunkId("d", 3, "Text")).not.toBe(base);
  });
  it("handles unicode text", () => {
    expect(chunkId("d", 0, "中文😀")).toMatch(/^[0-9a-f]{64}$/);
  });
});
