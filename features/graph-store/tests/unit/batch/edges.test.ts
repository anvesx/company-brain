import { describe, expect, it } from "vitest";
import type { Edge } from "../../../src/index.js";
import { code, edge, node, openStore } from "../../support/helpers.js";

// edgesOf: the same answer as neighbors() per id, in a bounded number of queries instead of one per id.
const keys = (es: Edge[]) => es.map((e) => `${e.from} -${e.kind}-> ${e.to}`).sort();

function world() {
  const s = openStore();
  for (const id of ["a", "b", "c", "d"]) s.upsertNode(node(id), 1);
  s.addEdge(edge("a", "b"), 1);
  s.addEdge(edge("a", "c", { kind: "can-read" }), 1);
  s.addEdge(edge("d", "a", { kind: "mentions" }), 1);
  s.addEdge(edge("b", "c"), 3);
  s.removeEdge(edge("a", "b"), 7);
  s.addEdge(edge("a", "x", { tenant: "t2" }), 1);
  return s;
}

describe("edgesOf", () => {
  it("returns the current out-edges or in-edges of every id, filtered by kinds", () => {
    const s = world();
    expect(keys(s.edgesOf("t1", ["a", "b"], { dir: "out" }))).toEqual(["a -can-read-> c", "b -links-to-> c"]);
    expect(keys(s.edgesOf("t1", ["a", "c"], { dir: "in" }))).toEqual(["a -can-read-> c", "b -links-to-> c", "d -mentions-> a"]);
    expect(keys(s.edgesOf("t1", ["a", "b"], { dir: "out", kinds: ["can-read"] }))).toEqual(["a -can-read-> c"]);
    expect(s.edgesOf("t1", ["a"], { dir: "out", kinds: [] })).toEqual([]);
  });

  it("matches neighbors() per id at asOf, and stays inside the tenant", () => {
    const s = world();
    const each = ["a", "b", "d"].flatMap((id) => s.neighbors("t1", id, { dir: "out", asOf: 4 }));
    expect(keys(s.edgesOf("t1", ["a", "b", "d"], { dir: "out", asOf: 4 }))).toEqual(keys(each));
    expect(keys(s.edgesOf("t1", ["a"], { dir: "out", asOf: 4 }))).toContain("a -links-to-> b");
    expect(keys(s.edgesOf("t2", ["a"], { dir: "out" }))).toEqual(["a -links-to-> x"]);
  });

  it("answers an empty id list with an empty list, and 12,000 ids across three query chunks, in insertion order", () => {
    const s = openStore();
    expect(s.edgesOf("t1", [], { dir: "out" })).toEqual([]);
    const ids = Array.from({ length: 12_000 }, (_, i) => `s${String(i).padStart(5, "0")}`);
    const inserted = [...ids].reverse(); // the answer is in insertion order, so it must cross chunk borders unsorted
    for (const id of inserted) s.addEdge(edge(id, "hub"), 1);
    s.addEdge({ ...edge("s00000", "hub"), tenant: "t2" }, 1);
    const out = s.edgesOf("t1", ids, { dir: "out" });
    expect(out.map((e) => e.from)).toEqual(inserted);
    expect(out.every((e) => e.tenant === "t1")).toBe(true);
    expect(s.edgesOf("t1", ["hub"], { dir: "in" })).toHaveLength(12_000);
  });

  it("rejects a bad direction or an unknown kind with BAD_INPUT, and a closed store with CLOSED", () => {
    const s = world();
    expect(code(() => s.edgesOf("t1", ["a"], { dir: "up" as "out" }))).toBe("BAD_INPUT");
    expect(code(() => s.edgesOf("t1", ["a"], { dir: "out", kinds: ["likes" as "can-read"] }))).toBe("BAD_INPUT");
    s.close();
    expect(code(() => s.edgesOf("t1", ["a"], { dir: "out" }))).toBe("CLOSED");
  });
});
