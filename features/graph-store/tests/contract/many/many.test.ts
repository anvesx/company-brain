import { describe, expect, it } from "vitest";
import type { Edge } from "../../../src/index.js";
import { edge, node } from "../../support/helpers.js";
import { codeOf } from "../../support/pg/async.js";
import { type AsyncStore, factories, openOn } from "../../support/pg/factories.js";

// nodesOf and edgesOf (the batch reads graph-view needs) must answer the same on every dialect.
const keys = (es: Edge[]) => es.map((e) => `${e.from} -${e.kind}-> ${e.to}`);

async function world(f: (typeof factories)[number]): Promise<AsyncStore> {
  const s = await openOn(f);
  for (const id of ["b", "a", "c", "d"]) await s.upsertNode(node(id), 1);
  await s.upsertNode(node("a", { title: "newer" }), 5);
  await s.upsertNode(node("z", { tenant: "t2" }), 1);
  await s.addEdge(edge("a", "b"), 1);
  await s.addEdge(edge("a", "c", { kind: "can-read" }), 1);
  await s.addEdge(edge("d", "a", { kind: "mentions" }), 1);
  await s.addEdge(edge("b", "c"), 3);
  await s.removeEdge(edge("a", "b"), 7);
  await s.addEdge(edge("a", "x", { tenant: "t2" }), 1);
  return s;
}

for (const f of factories)
  describe.skipIf(f.skip !== undefined)(`${f.name}: nodesOf and edgesOf`, () => {
    it("nodesOf returns the nodes among the ids sorted by id, dropping missing and duplicate ids", async () => {
      const s = await world(f);
      expect((await s.nodesOf("t1", ["d", "a", "nope", "a", "b"])).map((n) => n.id)).toEqual(["a", "b", "d"]);
      expect(await s.nodesOf("t1", [])).toEqual([]);
    });

    it("nodesOf honours asOf and the tenant", async () => {
      const s = await world(f);
      expect((await s.nodesOf("t1", ["a"]))[0]?.title).toBe("newer");
      expect((await s.nodesOf("t1", ["a"], 4))[0]?.title).toBe(node("a").title);
      expect(await s.nodesOf("t1", ["a"], 0)).toEqual([]);
      expect((await s.nodesOf("t2", ["a", "z"])).map((n) => n.id)).toEqual(["z"]);
    });

    it("edgesOf gives out or in edges in insertion order, filtered by kinds", async () => {
      const s = await world(f);
      expect(keys(await s.edgesOf("t1", ["b", "a"], { dir: "out" }))).toEqual(["a -can-read-> c", "b -links-to-> c"]);
      expect(keys(await s.edgesOf("t1", ["c", "a"], { dir: "in" }))).toEqual(["a -can-read-> c", "d -mentions-> a", "b -links-to-> c"]);
      expect(keys(await s.edgesOf("t1", ["a", "b"], { dir: "out", kinds: ["can-read"] }))).toEqual(["a -can-read-> c"]);
      expect(await s.edgesOf("t1", ["a"], { dir: "out", kinds: [] })).toEqual([]);
    });

    it("edgesOf matches neighbors per id at asOf and stays inside the tenant", async () => {
      const s = await world(f);
      const each = (await Promise.all(["a", "b", "d"].map((id) => s.neighbors("t1", id, { dir: "out", asOf: 4 })))).flat();
      expect(keys(await s.edgesOf("t1", ["a", "b", "d"], { dir: "out", asOf: 4 })).sort()).toEqual(keys(each).sort());
      expect(keys(await s.edgesOf("t2", ["a"], { dir: "out" }))).toEqual(["a -links-to-> x"]);
    });

    it("rejects bad input with BAD_INPUT and a closed store with CLOSED", async () => {
      const s = await world(f);
      expect(await codeOf(() => s.edgesOf("t1", ["a"], { dir: "up" as "out" }))).toBe("BAD_INPUT");
      expect(await codeOf(() => s.edgesOf("t1", ["a"], { dir: "out", kinds: ["likes" as "can-read"] }))).toBe("BAD_INPUT");
      expect(await codeOf(() => s.nodesOf("t1", [1 as unknown as string]))).toBe("BAD_INPUT");
      expect(
        await codeOf(() =>
          s.nodesOf(
            "t1",
            Array.from({ length: 100_001 }, (_, i) => `n${i}`),
          ),
        ),
      ).toBe("BAD_INPUT");
      await s.close();
      expect(await codeOf(() => s.nodesOf("t1", ["a"]))).toBe("CLOSED");
    });

    it("handles 12,000 ids at once, edges in insertion order", async () => {
      const s = await openOn(f);
      const ids = Array.from({ length: 12_000 }, (_, i) => `s${String(i).padStart(5, "0")}`);
      const inserted = [...ids].reverse();
      for (const id of inserted.slice(0, 300)) await s.addEdge(edge(id, "hub"), 1);
      const out = await s.edgesOf("t1", ids, { dir: "out" });
      expect(out.map((e) => e.from)).toEqual(inserted.slice(0, 300));
    });
  });
