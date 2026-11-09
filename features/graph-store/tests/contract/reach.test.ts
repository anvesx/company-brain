import { describe, expect, it } from "vitest";
import { edge, node } from "../support/helpers.js";
import { codeOf } from "../support/pg/async.js";
import { type AsyncStore, factories, openOn } from "../support/pg/factories.js";

const ids = (xs: { id: string }[]) => xs.map((x) => x.id);
const links = { kinds: ["links-to" as const] };

/** a -> b -> c -> a (a cycle) and a -> d; every node exists except "ghost", which a also points at first. */
async function graph(s: AsyncStore): Promise<void> {
  for (const id of ["a", "b", "c", "d"]) await s.upsertNode(node(id), 1);
  for (const [x, y] of [
    ["a", "ghost"],
    ["a", "b"],
    ["b", "c"],
    ["c", "a"],
    ["a", "d"],
  ] as const)
    await s.addEdge(edge(x, y), 1);
}

// reach (spec graph-store, Behaviour 4-5) on every dialect.
for (const f of factories)
  describe.skipIf(f.skip !== undefined)(`${f.name}: reach`, () => {
    it("is breadth-first, level by level then insertion order, never returns the start", async () => {
      const s = await openOn(f);
      await graph(s);
      expect(ids(await s.reach("t1", "a", { ...links, depth: 6, limit: 100 }))).toEqual(["b", "d", "c"]);
    });

    it("is capped by depth; depth 0 and limit 0 return nothing", async () => {
      const s = await openOn(f);
      await graph(s);
      expect(ids(await s.reach("t1", "a", { ...links, depth: 1, limit: 100 }))).toEqual(["b", "d"]);
      expect(await s.reach("t1", "a", { ...links, depth: 0, limit: 100 })).toEqual([]);
      expect(await s.reach("t1", "a", { ...links, depth: 3, limit: 0 })).toEqual([]);
    });

    it("returns exactly min(limit, reachable); ghost edges never count toward the limit", async () => {
      const s = await openOn(f);
      await graph(s);
      expect(ids(await s.reach("t1", "a", { ...links, depth: 6, limit: 2 }))).toEqual(["b", "d"]);
      expect(ids(await s.reach("t1", "a", { ...links, depth: 6, limit: 1 }))).toEqual(["b"]);
    });

    it("depth over 6 rejects DEPTH_LIMIT; bad options reject BAD_INPUT", async () => {
      const s = await openOn(f);
      expect(await codeOf(() => s.reach("t1", "a", { ...links, depth: 7, limit: 1 }))).toBe("DEPTH_LIMIT");
      expect(await codeOf(() => s.reach("t1", "a", { ...links, depth: 1.5, limit: 1 }))).toBe("BAD_INPUT");
      expect(await codeOf(() => s.reach("t1", "a", { kinds: ["alien" as never], depth: 1, limit: 1 }))).toBe("BAD_INPUT");
    });

    it("follows only the given kinds and honours asOf", async () => {
      const s = await openOn(f);
      await graph(s);
      await s.addEdge(edge("a", "c", { kind: "mentions" }), 1);
      await s.removeEdge(edge("a", "d"), 5);
      expect(ids(await s.reach("t1", "a", { kinds: ["mentions"], depth: 1, limit: 9 }))).toEqual(["c"]);
      expect(ids(await s.reach("t1", "a", { ...links, depth: 1, limit: 9 }))).toEqual(["b"]);
      expect(ids(await s.reach("t1", "a", { ...links, depth: 1, limit: 9, asOf: 2 }))).toEqual(["b", "d"]);
    });

    it("walks a wide fan-out (3000 edges) to the exact count", async () => {
      const s = await openOn(f);
      await s.upsertNode(node("root"), 1);
      for (let i = 0; i < 3000; i++) {
        if (i % 2 === 0) await s.upsertNode(node(`n${i}`), 1);
        await s.addEdge(edge("root", `n${i}`), 1);
      }
      expect(await s.reach("t1", "root", { ...links, depth: 1, limit: 5000 })).toHaveLength(1500);
      expect(ids(await s.reach("t1", "root", { ...links, depth: 1, limit: 3 }))).toEqual(["n0", "n2", "n4"]);
    });
  });
