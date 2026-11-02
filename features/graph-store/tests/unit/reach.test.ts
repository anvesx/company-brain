import { describe, expect, it } from "vitest";
import { code, edge, node, openStore } from "../support/helpers.js";

const ids = (ns: { id: string }[]) => ns.map((n) => n.id);

function chain() {
  const s = openStore();
  for (const id of ["a", "b", "c", "d"]) s.upsertNode(node(id), 1);
  s.addEdge(edge("a", "b"), 1);
  s.addEdge(edge("b", "c"), 1);
  s.addEdge(edge("c", "d"), 1);
  return s;
}

describe("reach", () => {
  it("is breadth-first and respects depth", () => {
    const s = chain();
    expect(ids(s.reach("t1", "a", { kinds: ["links-to"], depth: 1, limit: 10 }))).toEqual(["b"]);
    expect(ids(s.reach("t1", "a", { kinds: ["links-to"], depth: 2, limit: 10 }))).toEqual(["b", "c"]);
    expect(ids(s.reach("t1", "a", { kinds: ["links-to"], depth: 3, limit: 10 }))).toEqual(["b", "c", "d"]);
    expect(s.reach("t1", "a", { kinds: ["links-to"], depth: 0, limit: 10 })).toEqual([]);
  });

  it("orders by level then insertion, and honours limit", () => {
    const s = openStore();
    for (const id of ["r", "x", "y", "z", "w"]) s.upsertNode(node(id), 1);
    for (const to of ["x", "y", "z"]) s.addEdge(edge("r", to), 1);
    s.addEdge(edge("x", "w"), 1);
    expect(ids(s.reach("t1", "r", { kinds: ["links-to"], depth: 2, limit: 10 }))).toEqual(["x", "y", "z", "w"]);
    expect(ids(s.reach("t1", "r", { kinds: ["links-to"], depth: 2, limit: 2 }))).toEqual(["x", "y"]);
    expect(s.reach("t1", "r", { kinds: ["links-to"], depth: 2, limit: 0 })).toEqual([]);
  });

  it("follows only the requested kinds", () => {
    const s = chain();
    s.upsertNode(node("e"), 1);
    s.addEdge(edge("a", "e", { kind: "mentions" }), 1);
    expect(ids(s.reach("t1", "a", { kinds: ["mentions"], depth: 3, limit: 10 }))).toEqual(["e"]);
    expect(ids(s.reach("t1", "a", { kinds: ["mentions", "links-to"], depth: 1, limit: 10 }))).toEqual(["b", "e"]);
    expect(s.reach("t1", "a", { kinds: [], depth: 3, limit: 10 })).toEqual([]);
  });

  it("is cycle-safe and never returns the start node or duplicates", () => {
    const s = chain();
    s.addEdge(edge("d", "a"), 1);
    s.addEdge(edge("a", "a"), 1);
    expect(ids(s.reach("t1", "a", { kinds: ["links-to"], depth: 6, limit: 100 }))).toEqual(["b", "c", "d"]);
  });

  it("skips missing nodes and does not traverse through them", () => {
    const s = chain();
    s.tombstone("t1", "b", 2);
    expect(s.reach("t1", "a", { kinds: ["links-to"], depth: 3, limit: 10 })).toEqual([]);
    s.addEdge(edge("a", "ghost"), 3);
    s.addEdge(edge("ghost", "c"), 3);
    expect(s.reach("t1", "a", { kinds: ["links-to"], depth: 3, limit: 10 })).toEqual([]);
  });

  it("supports asOf", () => {
    const s = chain();
    s.removeEdge(edge("a", "b"), 10);
    expect(s.reach("t1", "a", { kinds: ["links-to"], depth: 3, limit: 10 })).toEqual([]);
    expect(ids(s.reach("t1", "a", { kinds: ["links-to"], depth: 3, limit: 10, asOf: 5 }))).toEqual(["b", "c", "d"]);
  });

  it("caps depth at 6 and validates arguments", () => {
    const s = chain();
    expect(s.reach("t1", "a", { kinds: ["links-to"], depth: 6, limit: 1 })).toHaveLength(1);
    expect(code(() => s.reach("t1", "a", { kinds: ["links-to"], depth: 7, limit: 1 }))).toBe("DEPTH_LIMIT");
    expect(code(() => s.reach("t1", "a", { kinds: ["links-to"], depth: -1, limit: 1 }))).toBe("BAD_INPUT");
    expect(code(() => s.reach("t1", "a", { kinds: ["links-to"], depth: 1.5, limit: 1 }))).toBe("BAD_INPUT");
    expect(code(() => s.reach("t1", "a", { kinds: ["links-to"], depth: 1, limit: -1 }))).toBe("BAD_INPUT");
    expect(code(() => s.reach("t1", "a", { kinds: ["nope" as never], depth: 1, limit: 1 }))).toBe("BAD_INPUT");
    expect(code(() => s.reach("t1", "a", { kinds: "links-to" as never, depth: 1, limit: 1 }))).toBe("BAD_INPUT");
  });
});
