import { describe, expect, it } from "vitest";
import { code, edge, node, openStore } from "../../support/helpers.js";

describe("input validation", () => {
  it("rejects empty or non-string tenant and id", () => {
    const s = openStore();
    expect(code(() => s.upsertNode(node("a", { tenant: "" }), 1))).toBe("BAD_INPUT");
    expect(code(() => s.upsertNode(node(""), 1))).toBe("BAD_INPUT");
    expect(code(() => s.node("", "a"))).toBe("BAD_INPUT");
    expect(code(() => s.node("t1", 5 as never))).toBe("BAD_INPUT");
    expect(code(() => s.history("", "a"))).toBe("BAD_INPUT");
    expect(code(() => s.neighbors("t1", ""))).toBe("BAD_INPUT");
    expect(code(() => s.tombstone("", "a", 1))).toBe("BAD_INPUT");
    expect(code(() => s.reach("", "a", { kinds: [], depth: 1, limit: 1 }))).toBe("BAD_INPUT");
  });
  it("rejects unknown kinds and non-string fields", () => {
    const s = openStore();
    expect(code(() => s.upsertNode(node("a", { kind: "alien" as never }), 1))).toBe("BAD_INPUT");
    expect(code(() => s.upsertNode(node("a", { title: 3 as never }), 1))).toBe("BAD_INPUT");
    expect(code(() => s.addEdge(edge("a", "b", { kind: "alien" as never }), 1))).toBe("BAD_INPUT");
    expect(code(() => s.addEdge(edge("a", "", {}), 1))).toBe("BAD_INPUT");
    expect(code(() => s.addEdge(edge("a", "b", { source: "" }), 1))).toBe("BAD_INPUT");
    expect(code(() => s.removeEdge(edge("a", "b", { kind: "alien" as never }), 1))).toBe("BAD_INPUT");
    expect(code(() => s.neighbors("t1", "a", { kind: "alien" as never }))).toBe("BAD_INPUT");
    expect(code(() => s.neighbors("t1", "a", { dir: "up" as never }))).toBe("BAD_INPUT");
  });
  it("rejects non-finite timestamps", () => {
    const s = openStore();
    for (const at of [Number.NaN, Number.POSITIVE_INFINITY, "1" as never]) {
      expect(code(() => s.upsertNode(node("a"), at))).toBe("BAD_INPUT");
      expect(code(() => s.addEdge(edge("a", "b"), at))).toBe("BAD_INPUT");
      expect(code(() => s.removeEdge(edge("a", "b"), at))).toBe("BAD_INPUT");
      expect(code(() => s.tombstone("t1", "a", at))).toBe("BAD_INPUT");
    }
    expect(code(() => s.node("t1", "a", Number.NaN))).toBe("BAD_INPUT");
    expect(code(() => s.neighbors("t1", "a", { asOf: Number.NaN }))).toBe("BAD_INPUT");
  });
  it("accepts negative and fractional timestamps", () => {
    const s = openStore();
    s.upsertNode(node("a"), -5.5);
    expect(s.node("t1", "a", -5.5)?.id).toBe("a");
  });
  it("a failed upsert leaves no partial row", () => {
    const s = openStore();
    s.upsertNode(node("a"), 5);
    expect(code(() => s.upsertNode(node("a", { title: "x", props: { text: "t" } }), 6))).toBe("BAD_INPUT");
    expect(s.history("t1", "a")).toHaveLength(1);
  });
});
