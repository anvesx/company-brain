import { describe, expect, it } from "vitest";
import { edge, node } from "../support/helpers.js";
import { codeOf } from "../support/pg/async.js";
import { factories, openOn } from "../support/pg/factories.js";

// The same rules (spec graph-store, Behaviour 1-3) on every dialect. Only the factory differs.
for (const f of factories)
  describe.skipIf(f.skip !== undefined)(`${f.name}: nodes`, () => {
    it("round-trips every field, props keys come back sorted", async () => {
      const s = await openOn(f);
      const n = node("a", { kind: "repo", props: { z: "2", b: "1", m: "3" } });
      await s.upsertNode(n, 10);
      expect(await s.node("t1", "a")).toEqual(n);
      expect(Object.keys((await s.node("t1", "a"))?.props ?? {})).toEqual(["b", "m", "z"]);
      expect(await s.node("t1", "missing")).toBeUndefined();
    });

    it("filters every read by tenant first", async () => {
      const s = await openOn(f);
      await s.upsertNode(node("a"), 1);
      await s.addEdge(edge("a", "b"), 1);
      expect(await s.node("t2", "a")).toBeUndefined();
      expect(await s.history("t2", "a")).toEqual([]);
      expect(await s.neighbors("t2", "a")).toEqual([]);
      expect(await s.reach("t2", "a", { kinds: ["links-to"], depth: 2, limit: 10 })).toEqual([]);
      expect(await s.edgesBySource("t2", "gdrive", "links-to")).toEqual([]);
    });

    it("the same id lives independently in two tenants", async () => {
      const s = await openOn(f);
      await s.upsertNode(node("a", { title: "one" }), 1);
      await s.upsertNode(node("a", { tenant: "t2", title: "two" }), 1);
      expect([(await s.node("t1", "a"))?.title, (await s.node("t2", "a"))?.title]).toEqual(["one", "two"]);
    });

    it("a changed upsert closes the old row at `at`; asOf reads the row valid then", async () => {
      const s = await openOn(f);
      await s.upsertNode(node("a", { title: "old" }), 1);
      await s.upsertNode(node("a", { title: "new" }), 5);
      expect((await s.node("t1", "a", 1))?.title).toBe("old");
      expect((await s.node("t1", "a", 4.999))?.title).toBe("old");
      expect((await s.node("t1", "a", 5))?.title).toBe("new");
      expect(await s.node("t1", "a", 0.5)).toBeUndefined();
      expect((await s.history("t1", "a")).map((x) => x.title)).toEqual(["old", "new"]);
    });

    it("an identical upsert is a no-op, even with props in another key order", async () => {
      const s = await openOn(f);
      await s.upsertNode(node("a", { props: { x: "1", y: "2" } }), 1);
      await s.upsertNode(node("a", { props: { y: "2", x: "1" } }), 9);
      expect(await s.history("t1", "a")).toHaveLength(1);
      expect((await s.node("t1", "a", 1))?.id).toBe("a");
    });

    it("an upsert earlier than the current row rejects BAD_INPUT and leaves no partial row", async () => {
      const s = await openOn(f);
      await s.upsertNode(node("a", { title: "one" }), 10);
      await s.upsertNode(node("a", { title: "same-instant" }), 10);
      expect(await codeOf(() => s.upsertNode(node("a", { title: "past" }), 5))).toBe("BAD_INPUT");
      expect((await s.history("t1", "a")).map((x) => x.title)).toEqual(["one", "same-instant"]);
      expect((await s.node("t1", "a"))?.title).toBe("same-instant");
    });

    it("negative and fractional timestamps work; NaN and Infinity reject", async () => {
      const s = await openOn(f);
      await s.upsertNode(node("a"), -5.5);
      expect((await s.node("t1", "a", -5.5))?.id).toBe("a");
      for (const at of [Number.NaN, Number.POSITIVE_INFINITY]) expect(await codeOf(() => s.upsertNode(node("b"), at))).toBe("BAD_INPUT");
    });

    it("persists: a second handle on the same database sees every write", async () => {
      const backing = await f.fresh();
      const a = await backing.open();
      await a.upsertNode(node("a", { title: "v1" }), 1);
      await a.upsertNode(node("a", { title: "v2" }), 2);
      const b = await backing.open();
      expect((await b.node("t1", "a"))?.title).toBe("v2");
      expect(await b.history("t1", "a")).toHaveLength(2);
    });
  });
