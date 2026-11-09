import { describe, expect, it } from "vitest";
import { code, node, openStore } from "../../support/helpers.js";

// nodesOf: the same answer as node() per id, in a bounded number of queries instead of one per id.
function world() {
  const s = openStore();
  for (const id of ["a", "b", "c"]) s.upsertNode(node(id), 1);
  s.upsertNode(node("a", { title: "a renamed" }), 5);
  s.upsertNode(node("x", { tenant: "t2" }), 1);
  return s;
}

describe("nodesOf", () => {
  it("returns the nodes among ids that exist, sorted by id, missing and duplicate ids dropped", () => {
    const s = world();
    expect(s.nodesOf("t1", ["c", "zz", "a", "c"]).map((n) => [n.id, n.title])).toEqual([
      ["a", "a renamed"],
      ["c", "Title c"],
    ]);
  });

  it("reads the row valid at asOf and stays inside the tenant", () => {
    const s = world();
    expect(s.nodesOf("t1", ["a"], 2).map((n) => n.title)).toEqual(["Title a"]);
    expect(s.nodesOf("t1", ["a"], 0)).toEqual([]);
    expect(s.nodesOf("t1", ["x"])).toEqual([]);
    expect(s.nodesOf("t2", ["x"]).map((n) => n.tenant)).toEqual(["t2"]);
  });

  it("answers an empty id list with an empty list, and 12,000 ids across query chunks", () => {
    const s = openStore();
    expect(s.nodesOf("t1", [])).toEqual([]);
    const ids = Array.from({ length: 12_000 }, (_, i) => `n${String(i).padStart(5, "0")}`);
    for (const id of ids) s.upsertNode(node(id), 1);
    expect(s.nodesOf("t1", ids).map((n) => n.id)).toEqual(ids);
  });

  it("rejects a non-string id with BAD_INPUT, and a closed store with CLOSED", () => {
    const s = world();
    expect(code(() => s.nodesOf("t1", [1 as unknown as string]))).toBe("BAD_INPUT");
    s.close();
    expect(code(() => s.nodesOf("t1", ["a"]))).toBe("CLOSED");
  });
});
