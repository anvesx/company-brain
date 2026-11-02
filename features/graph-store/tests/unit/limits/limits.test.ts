import { describe, expect, it } from "vitest";
import { code, node, openStore } from "../../support/helpers.js";

const FIELD_LIMITS = { title: 512, address: 2048, version: 256, source: 128 } as const;

describe("field and props limits (README: Limits)", () => {
  it.each(Object.entries(FIELD_LIMITS))("%s accepts exactly %i bytes and rejects one more", (field, max) => {
    const s = openStore();
    s.upsertNode(node("ok", { [field]: "x".repeat(max) }), 1);
    expect(code(() => s.upsertNode(node("big", { [field]: "x".repeat(max + 1) }), 1))).toBe("BAD_INPUT");
    expect(s.node("t1", "big")).toBeUndefined();
  });
  it("rejects a 5,000,000 character title", () => {
    expect(code(() => openStore().upsertNode(node("a", { title: "x".repeat(5_000_000) }), 1))).toBe("BAD_INPUT");
  });
  it("measures field limits in bytes", () => {
    expect(code(() => openStore().upsertNode(node("a", { title: "é".repeat(257) }), 1))).toBe("BAD_INPUT");
  });
  it("accepts 32 props and rejects 33", () => {
    const s = openStore();
    const many = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`k${i}`, "v"]));
    s.upsertNode(node("a", { props: many(32) }), 1);
    expect(code(() => s.upsertNode(node("b", { props: many(33) }), 1))).toBe("BAD_INPUT");
  });
  it("accepts a 64 byte key and rejects 65", () => {
    const s = openStore();
    s.upsertNode(node("a", { props: { ["k".repeat(64)]: "v" } }), 1);
    expect(code(() => s.upsertNode(node("b", { props: { ["k".repeat(65)]: "v" } }), 1))).toBe("BAD_INPUT");
  });
  it.each(["has space", "two\nlines", "", "1starts", "ünï", "a/b"])("rejects key %j that is not an identifier", (k) => {
    expect(code(() => openStore().upsertNode(node("a", { props: { [k]: "v" } }), 1))).toBe("BAD_INPUT");
  });
  it("rejects total props over 4 KiB", () => {
    const props = Object.fromEntries(Array.from({ length: 5 }, (_, i) => [`k${i}`, "x".repeat(1000)]));
    expect(code(() => openStore().upsertNode(node("a", { props }), 1))).toBe("BAD_INPUT");
  });
  it.each(["a\nb", "a\u0000b", "a\tb", "a\u007fb"])("rejects control characters in a prop value %j", (v) => {
    expect(code(() => openStore().upsertNode(node("a", { props: { k: v } }), 1))).toBe("BAD_INPUT");
  });
  it.each(["title", "address", "version", "source"])("rejects a newline in %s", (f) => {
    expect(code(() => openStore().upsertNode(node("a", { [f]: "a\nb" }), 1))).toBe("BAD_INPUT");
  });
});
