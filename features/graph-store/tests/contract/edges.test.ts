import { describe, expect, it } from "vitest";
import { edge, node } from "../support/helpers.js";
import { codeOf } from "../support/pg/async.js";
import { factories, openOn } from "../support/pg/factories.js";

// Edges and tombstones (spec graph-store, Behaviour 2, 4, 7) on every dialect.
for (const f of factories)
  describe.skipIf(f.skip !== undefined)(`${f.name}: edges`, () => {
    it("addEdge is idempotent and allows edges to nodes that do not exist yet", async () => {
      const s = await openOn(f);
      await s.addEdge(edge("a", "ghost"), 1);
      await s.addEdge(edge("a", "ghost"), 2);
      expect(await s.neighbors("t1", "a")).toEqual([edge("a", "ghost")]);
    });

    it("removeEdge sets validTo instead of deleting; asOf still sees it", async () => {
      const s = await openOn(f);
      await s.addEdge(edge("a", "b"), 1);
      await s.addEdge(edge("a", "c"), 1);
      await s.removeEdge(edge("a", "c"), 3);
      expect((await s.neighbors("t1", "a")).map((e) => e.to)).toEqual(["b"]);
      expect((await s.neighbors("t1", "a", { asOf: 2 })).map((e) => e.to)).toEqual(["b", "c"]);
      await s.addEdge(edge("a", "c"), 4);
      expect((await s.neighbors("t1", "a")).map((e) => e.to)).toEqual(["b", "c"]);
    });

    it("neighbors filters by direction and kind, in insertion order", async () => {
      const s = await openOn(f);
      await s.addEdge(edge("a", "b"), 1);
      await s.addEdge(edge("c", "a", { kind: "mentions" }), 1);
      await s.addEdge(edge("a", "d", { kind: "authored" }), 1);
      expect((await s.neighbors("t1", "a", { dir: "out" })).map((e) => e.to)).toEqual(["b", "d"]);
      expect((await s.neighbors("t1", "a", { dir: "in" })).map((e) => e.from)).toEqual(["c"]);
      expect((await s.neighbors("t1", "a", { kind: "authored" })).map((e) => e.to)).toEqual(["d"]);
      expect(await s.neighbors("t1", "a")).toHaveLength(3);
      expect(await codeOf(() => s.neighbors("t1", "a", { dir: "up" as never }))).toBe("BAD_INPUT");
    });

    it("edgesBySource returns the current edges of one kind one source wrote", async () => {
      const s = await openOn(f);
      await s.addEdge(edge("a", "b", { source: "slack" }), 1);
      await s.addEdge(edge("a", "c", { source: "gdrive" }), 1);
      await s.addEdge(edge("a", "d", { source: "slack" }), 1);
      await s.removeEdge(edge("a", "d", { source: "slack" }), 2);
      expect((await s.edgesBySource("t1", "slack", "links-to")).map((e) => e.to)).toEqual(["b"]);
    });

    it("tombstone closes the node and every edge touching it, both directions", async () => {
      const s = await openOn(f);
      await s.upsertNode(node("x"), 1);
      await s.addEdge(edge("x", "y"), 1);
      await s.addEdge(edge("z", "x"), 1);
      await s.tombstone("t1", "x", 5);
      expect(await s.node("t1", "x")).toBeUndefined();
      expect((await s.node("t1", "x", 4))?.id).toBe("x");
      expect(await s.neighbors("t1", "x")).toEqual([]);
      expect(await s.neighbors("t1", "x", { asOf: 4 })).toHaveLength(2);
      expect(await s.history("t1", "x")).toHaveLength(1);
    });

    it("rejects unknown kinds and empty ends with BAD_INPUT, as a rejected promise", async () => {
      const s = await openOn(f);
      expect(await codeOf(() => s.addEdge(edge("a", "b", { kind: "alien" as never }), 1))).toBe("BAD_INPUT");
      expect(await codeOf(() => s.addEdge(edge("a", ""), 1))).toBe("BAD_INPUT");
      expect(await codeOf(() => s.removeEdge(edge("a", "b", { source: "" }), 1))).toBe("BAD_INPUT");
      expect(await codeOf(() => s.tombstone("", "a", 1))).toBe("BAD_INPUT");
    });
  });
