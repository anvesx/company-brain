import { describe, expect, it } from "vitest";
import { code, node, openStore } from "../support/helpers.js";

describe("node history", () => {
  it("each changed field supersedes: old row closed, new row current", () => {
    const s = openStore();
    s.upsertNode(node("a"), 1);
    const changes = [{ title: "T2" }, { version: "2" }, { source: "box" }, { address: "other" }, { kind: "repo" as const }, { props: { k: "v" } }];
    for (const [i, c] of changes.entries()) s.upsertNode(node("a", c), 10 + i);
    expect(s.history("t1", "a")).toHaveLength(1 + changes.length);
  });

  it("as-of reads the row valid at that time", () => {
    const s = openStore();
    s.upsertNode(node("a", { title: "old" }), 10);
    s.upsertNode(node("a", { title: "new" }), 20);
    expect(s.node("t1", "a", 9)).toBeUndefined();
    expect(s.node("t1", "a", 10)?.title).toBe("old");
    expect(s.node("t1", "a", 19.5)?.title).toBe("old");
    expect(s.node("t1", "a", 20)?.title).toBe("new");
    expect(s.node("t1", "a")?.title).toBe("new");
    expect(s.node("t1", "a", 0)).toBeUndefined();
  });

  it("history is ordered oldest first and keeps closed rows", () => {
    const s = openStore();
    s.upsertNode(node("a", { title: "1" }), 1);
    s.upsertNode(node("a", { title: "2" }), 2);
    s.upsertNode(node("a", { title: "3" }), 3);
    expect(s.history("t1", "a").map((n) => n.title)).toEqual(["1", "2", "3"]);
  });

  it("rejects an upsert dated before the current row", () => {
    const s = openStore();
    s.upsertNode(node("a"), 10);
    expect(code(() => s.upsertNode(node("a", { title: "x" }), 9))).toBe("BAD_INPUT");
    expect(s.node("t1", "a")?.title).toBe("Title a");
  });

  it("tombstone closes the node and keeps history; a later upsert revives it", () => {
    const s = openStore();
    s.upsertNode(node("a"), 1);
    s.tombstone("t1", "a", 5);
    expect(s.node("t1", "a")).toBeUndefined();
    expect(s.node("t1", "a", 4)?.id).toBe("a");
    expect(s.node("t1", "a", 5)).toBeUndefined();
    s.upsertNode(node("a"), 8);
    expect(s.node("t1", "a")?.id).toBe("a");
    expect(s.history("t1", "a")).toHaveLength(2);
  });

  it("tombstone of an unknown node is harmless and touches no other tenant", () => {
    const s = openStore();
    s.upsertNode(node("a", { tenant: "t2" }), 1);
    s.tombstone("t1", "a", 2);
    s.tombstone("t1", "ghost", 2);
    expect(s.node("t2", "a")?.id).toBe("a");
  });
});
