import { describe, expect, it } from "vitest";
import { code, node, openStore } from "../../support/helpers.js";

describe("props are metadata only", () => {
  it.each(["text", "body", "content", "Text", "BODY"])("rejects key %s", (k) => {
    expect(code(() => openStore().upsertNode(node("a", { props: { [k]: "x" } }), 1))).toBe("BAD_INPUT");
  });
  it.each(["summary", "Excerpt", "transcript", "raw_text", "html-body", "snippet", "markdown", "payload", "message"])("rejects body alias %s", (k) => {
    expect(code(() => openStore().upsertNode(node("a", { props: { [k]: "x" } }), 1))).toBe("BAD_INPUT");
  });
  it("accepts metadata keys such as zone and updatedAt", () => {
    openStore().upsertNode(node("a", { props: { zone: "public", updatedAt: "2026" } }), 1);
  });
  it("accepts a value of exactly 1 KiB and rejects one byte more", () => {
    const s = openStore();
    s.upsertNode(node("a", { props: { k: "x".repeat(1024) } }), 1);
    expect(code(() => s.upsertNode(node("b", { props: { k: "x".repeat(1025) } }), 1))).toBe("BAD_INPUT");
  });
  it("measures bytes, not characters", () => {
    expect(code(() => openStore().upsertNode(node("a", { props: { k: "é".repeat(513) } }), 1))).toBe("BAD_INPUT");
  });
  it("rejects non-string values and non-object props", () => {
    const s = openStore();
    expect(code(() => s.upsertNode(node("a", { props: { k: 1 as never } }), 1))).toBe("BAD_INPUT");
    expect(code(() => s.upsertNode(node("a", { props: null as never }), 1))).toBe("BAD_INPUT");
    expect(code(() => s.upsertNode(node("a", { props: [] as never }), 1))).toBe("BAD_INPUT");
    expect(s.node("t1", "a")).toBeUndefined();
  });
});
