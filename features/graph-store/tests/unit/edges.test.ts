import { describe, expect, it } from "vitest";
import { edge, node, openStore } from "../support/helpers.js";

describe("edges", () => {
  it("addEdge is idempotent and edges to unknown nodes are allowed", () => {
    const s = openStore();
    s.addEdge(edge("a", "ghost"), 1);
    s.addEdge(edge("a", "ghost"), 2);
    expect(s.neighbors("t1", "a")).toEqual([edge("a", "ghost")]);
  });

  it("filters by kind and direction", () => {
    const s = openStore();
    s.addEdge(edge("a", "b", { kind: "authored" }), 1);
    s.addEdge(edge("a", "c", { kind: "mentions" }), 1);
    s.addEdge(edge("d", "a", { kind: "mentions" }), 1);
    const to = (es: { to: string }[]) => es.map((e) => e.to).sort();
    expect(to(s.neighbors("t1", "a", { dir: "out" }))).toEqual(["b", "c"]);
    expect(s.neighbors("t1", "a", { dir: "in" }).map((e) => e.from)).toEqual(["d"]);
    expect(s.neighbors("t1", "a")).toHaveLength(3);
    expect(to(s.neighbors("t1", "a", { kind: "mentions", dir: "out" }))).toEqual(["c"]);
    expect(s.neighbors("t1", "a", { kind: "mentions" })).toHaveLength(2);
    expect(s.neighbors("t1", "a", { kind: "can-read" })).toEqual([]);
  });

  it("removeEdge closes, never deletes; as-of sees it before removal", () => {
    const s = openStore();
    s.addEdge(edge("a", "b"), 10);
    s.removeEdge(edge("a", "b"), 20);
    expect(s.neighbors("t1", "a")).toEqual([]);
    expect(s.neighbors("t1", "a", { asOf: 15 })).toHaveLength(1);
    expect(s.neighbors("t1", "a", { asOf: 20 })).toEqual([]);
    expect(s.neighbors("t1", "a", { asOf: 9 })).toEqual([]);
    s.removeEdge(edge("a", "b"), 30);
    s.addEdge(edge("a", "b"), 40);
    expect(s.neighbors("t1", "a")).toHaveLength(1);
    expect(s.neighbors("t1", "a", { asOf: 25 })).toEqual([]);
  });

  it("removeEdge only affects its own tenant and kind", () => {
    const s = openStore();
    s.addEdge(edge("a", "b"), 1);
    s.addEdge(edge("a", "b", { tenant: "t2" }), 1);
    s.addEdge(edge("a", "b", { kind: "mentions" }), 1);
    s.removeEdge(edge("a", "b"), 2);
    expect(s.neighbors("t2", "a")).toHaveLength(1);
    expect(s.neighbors("t1", "a").map((e) => e.kind)).toEqual(["mentions"]);
  });

  it("tombstone closes every edge touching the node, both directions", () => {
    const s = openStore();
    s.upsertNode(node("a"), 1);
    s.addEdge(edge("a", "b"), 1);
    s.addEdge(edge("c", "a"), 1);
    s.addEdge(edge("c", "b"), 1);
    s.tombstone("t1", "a", 5);
    expect(s.neighbors("t1", "a")).toEqual([]);
    expect(s.neighbors("t1", "c").map((e) => e.to)).toEqual(["b"]);
    expect(s.neighbors("t1", "a", { asOf: 4 })).toHaveLength(2);
  });
});
