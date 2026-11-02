import { describe, expect, it } from "vitest";
import { code, edge, node, openStore } from "../../support/helpers.js";

describe("tombstone ordering", () => {
  it("rejects a tombstone before the current row's validFrom and changes nothing", () => {
    const s = openStore();
    s.upsertNode(node("a"), 100);
    s.addEdge(edge("a", "b"), 100);
    expect(code(() => s.tombstone("t1", "a", 50))).toBe("BAD_INPUT");
    expect(s.node("t1", "a")?.id).toBe("a");
    expect(s.neighbors("t1", "a")).toHaveLength(1);
  });
  it("accepts a tombstone exactly at validFrom", () => {
    const s = openStore();
    s.upsertNode(node("a"), 100);
    s.tombstone("t1", "a", 100);
    expect(s.node("t1", "a")).toBeUndefined();
  });
  it("tombstoning an unknown id stays a no-op", () => {
    openStore().tombstone("t1", "nope", 1);
  });
});
