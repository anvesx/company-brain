import { describe, expect, it } from "vitest";
import { visibleGraph } from "../../../src/index.js";
import { edge, edgeKeys, KEY, node, openStore, write } from "../../support/store.js";

/** alice and bob read doc d1, which belongs to project p1. bob and alice also hold can-read edges to projects. */
function world() {
  const store = openStore();
  const t = "t1";
  write(
    store,
    1,
    [
      node(t, "alice", "person", "slack"),
      node(t, "bob", "person", "slack"),
      node(t, "d1", "document", "gdrive"),
      node(t, "p1", "project", "linear"),
      node(t, "p-hidden", "project", "linear"),
    ],
    [
      edge(t, "alice", "d1", "can-read"),
      edge(t, "bob", "d1", "can-read"),
      edge(t, "d1", "p1", "belongs-to"),
      edge(t, "bob", "p1", "can-read"),
      edge(t, "alice", "p1", "can-read"),
      edge(t, "bob", "p-hidden", "can-read"),
    ],
  );
  return store;
}

describe("rule 1: edges between visible non-documents", () => {
  it("a can-read edge from a visible reader to a visible project is sent", () => {
    const keys = edgeKeys(visibleGraph(world(), { cursorKey: KEY, tenant: "t1", user: "alice" }).edges);
    expect(keys).toContain("bob -can-read-> p1");
    expect(keys).toContain("alice -can-read-> p1");
  });

  it("a can-read edge to an end that is not visible is still absent, and no edge is sent twice", () => {
    const keys = edgeKeys(visibleGraph(world(), { cursorKey: KEY, tenant: "t1", user: "alice" }).edges);
    expect(keys.some((k) => k.includes("p-hidden"))).toBe(false);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("rule 1: aliases of the caller", () => {
  const withAlias = () => {
    const store = world();
    write(
      store,
      1,
      [node("t1", "d2", "document", "gdrive")],
      [edge("t1", "ann@x.io", "d2", "can-read"), edge("t1", "ann@x.io", "eng", "member-of"), edge("t1", "eng", "d3", "can-read")],
    );
    write(store, 1, [node("t1", "eng", "team", "slack"), node("t1", "d3", "document", "gdrive")], []);
    return store;
  };

  it("sees what an alias can read, and what the alias's teams can read, only when the alias is given", () => {
    const ids = (aliases?: string[]) =>
      visibleGraph(withAlias(), { cursorKey: KEY, tenant: "t1", user: "alice", ...(aliases && { aliases }) }).nodes.map((n) => n.id);
    expect(ids()).not.toContain("d2");
    expect(ids(["ann@x.io"])).toEqual(expect.arrayContaining(["d2", "d3", "eng"]));
    expect(ids(["someone-else"])).not.toContain("d2");
  });
});
