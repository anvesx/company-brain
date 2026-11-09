import { describe, expect, it } from "vitest";
import { node } from "../../support/helpers.js";
import { factories, openOn } from "../../support/pg/factories.js";

// 20 "report" titles: even ones are documents, odd ones people. `accept` keeps people only, so a page of 3
// people ends on the 6th candidate (rows 1, 3, 5 kept; rows 0, 2, 4 looked at and dropped).
for (const f of factories)
  describe.skipIf(f.skip !== undefined)(`${f.name}: scanTitles reports what it spent`, () => {
    const seeded = async () => {
      const s = await openOn(f);
      for (let i = 0; i < 20; i++) await s.upsertNode(node(`r${i}`, { title: `report ${i}`, kind: i % 2 ? "person" : "document" }), 10);
      return s;
    };
    const people = { text: "report", accept: (n: { kind: string }) => n.kind === "person" };

    it("`examined` counts candidates up to the last kept row, or all of them", async () => {
      const s = await seeded();
      const full = await s.scanTitles("t1", { ...people, limit: 3 });
      expect(full.nodes.map((n) => n.id)).toEqual(["r1", "r3", "r5"]);
      expect(full.examined).toBe(6);
      const short = await s.scanTitles("t1", { ...people, limit: 100 });
      expect([short.nodes.length, short.examined, short.next]).toEqual([10, 20, undefined]);
      const capped = await s.scanTitles("t1", { ...people, limit: 100, cap: 7 });
      expect([capped.nodes.length, capped.examined, capped.truncated]).toEqual([3, 7, true]);
    });

    it("`cursors[i]` resumes right after `nodes[i]`", async () => {
      const s = await seeded();
      const page = await s.scanTitles("t1", { ...people, limit: 5 });
      expect(page.cursors).toHaveLength(5);
      expect(page.cursors.at(-1)).toBe(page.next);
      // Keep only the first 2 rows, then resume from cursors[1]: the next row is the 3rd person, nothing skipped.
      const rest = await s.scanTitles("t1", { ...people, limit: 1, cursor: page.cursors[1]! });
      expect(rest.nodes.map((n) => n.id)).toEqual(["r5"]);
    });
  });
