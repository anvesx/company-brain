import { describe, expect, it } from "vitest";
import type { ScanQuery } from "../../../src/index.js";
import { node } from "../../support/helpers.js";
import { codeOf } from "../../support/pg/async.js";
import { type AsyncStore, factories, openOn } from "../../support/pg/factories.js";

// scanTitles on every dialect: over every page it returns exactly the rows searchTitles (the oracle) returns,
// and no single call looks at more than `cap` candidates.
const TITLES = ["Budget report", "report 50% done", "a_b report", "Re: plan", "REPORT draft", "日本 report", "rep", "re", "quarterly review"];
const pages = async (s: AsyncStore, q: Omit<ScanQuery, "cursor">) => {
  const all: string[] = [];
  const flags: boolean[] = [];
  for (let cursor: number | undefined, n = 0; n < 500; n++) {
    const p = await s.scanTitles("t1", { ...q, ...(cursor === undefined ? {} : { cursor }) });
    all.push(...p.nodes.map((x) => x.id));
    flags.push(p.truncated);
    if (p.next === undefined) return { all, flags };
    cursor = p.next;
  }
  throw new Error("did not finish");
};
const oracle = async (s: AsyncStore, text: string) => (await s.searchTitles("t1", { text, limit: 1000 })).map((n) => n.id).sort();

for (const f of factories)
  describe.skipIf(f.skip !== undefined)(`${f.name}: scanTitles`, () => {
    const seeded = async () => {
      const s = await openOn(f);
      for (let i = 0; i < 12; i++)
        for (const [j, title] of TITLES.entries())
          await s.upsertNode(node(`d${i}-${j}`, { title: `${title} ${i}`, kind: j % 3 === 0 ? "person" : "document" }), 10);
      return s;
    };

    it.each(["report", "re", "50%", "a_b", "REPORT", "日本"])("pages to the same rows as the search oracle for %j", async (text) => {
      const s = await seeded();
      const { all } = await pages(s, { text, limit: 17 });
      expect(all.sort()).toEqual(await oracle(s, text));
      expect(all.length).toBeGreaterThan(0);
    });

    it("returns rows in insertion order", async () => {
      const s = await seeded();
      const { all } = await pages(s, { text: "report", limit: 1000 });
      expect(all.slice(0, 3)).toEqual(["d0-0", "d0-1", "d0-2"]);
    });

    it("stops at `cap` candidates, says truncated, and the cursor still reaches every row", async () => {
      const s = await seeded();
      const first = await s.scanTitles("t1", { text: "report", limit: 5, cap: 10, accept: () => false });
      expect(first).toMatchObject({ nodes: [], truncated: true });
      expect(first.next).toBeGreaterThan(0);
      const { all, flags } = await pages(s, { text: "report", limit: 1000, cap: 10 });
      expect(all.sort()).toEqual(await oracle(s, "report"));
      expect(flags.filter(Boolean).length).toBeGreaterThan(1);
    });

    it("applies the edge rule to one kind only", async () => {
      const s = await seeded();
      await s.addEdge({ tenant: "t1", from: "u1", to: "d0-1", kind: "can-read", source: "x" }, 10);
      const reachedBy = { from: ["u1"], kind: "can-read" as const, only: "document" as const };
      const { all } = await pages(s, { text: "report", limit: 1000, reachedBy });
      const kinds = await Promise.all(all.map(async (id) => (await s.node("t1", id))?.kind));
      expect(all.filter((_, i) => kinds[i] === "document")).toEqual(["d0-1"]);
      expect(all.length).toBeGreaterThan(1);
    });

    it("refuses bad cap, cursor, limit and text with BAD_INPUT", async () => {
      const s = await seeded();
      // A cursor past 2^53 - 1 is no seq we ever handed out; 2^63 overflows Postgres bigint (raw error 22003).
      const huge = [{ cursor: 2 ** 53 }, { cursor: 2 ** 63 }, { cursor: 9223372036854776000 }];
      for (const extra of [{ cap: 0 }, { cap: 2_000_000 }, { cursor: -1 }, { cursor: 1.5 }, { limit: 0 }, { limit: 1001 }, ...huge])
        expect(await codeOf(() => s.scanTitles("t1", { text: "re", limit: 5, ...extra }))).toBe("BAD_INPUT");
      expect(await codeOf(() => s.scanTitles("t1", { text: "\u0000", limit: 5 }))).toBe("BAD_INPUT");
    });
  });
