import { describe, expect, it } from "vitest";
import { node } from "../../support/helpers.js";
import { type AsyncStore, factories, openOn } from "../../support/pg/factories.js";

// searchTitles on every dialect: a substring match over current titles in one tenant, ordered by id, paged by keyset.
// `%`, `_` and `\` in the text are literal characters, never LIKE wildcards.
const TITLES: [string, string][] = [
  ["a1", "Budget 50% cut"],
  ["a2", "Budget 500 cut"],
  ["a3", "a_b notes"],
  ["a4", "axb notes"],
  ["a5", "back\\slash path"],
  ["a6", "QUARTERLY Plan"],
  ["a7", "日本 roadmap"],
  ["a8", "quarterly review"],
];
const ids = async (s: AsyncStore, text: string, more: Record<string, unknown> = {}) =>
  (await s.searchTitles("t1", { text, limit: 50, ...more })).map((n) => n.id);

for (const f of factories)
  describe.skipIf(f.skip !== undefined)(`${f.name}: searchTitles`, () => {
    const seeded = async () => {
      const s = await openOn(f);
      for (const [id, title] of TITLES) await s.upsertNode(node(id, { title }), 10);
      return s;
    };

    it("treats %, _ and backslash as literal characters", async () => {
      const s = await seeded();
      expect(await ids(s, "50%")).toEqual(["a1"]);
      expect(await ids(s, "a_b")).toEqual(["a3"]);
      expect(await ids(s, "%")).toEqual(["a1"]);
      expect(await ids(s, "_")).toEqual(["a3"]);
      expect(await ids(s, "k\\s")).toEqual(["a5"]);
    });

    it("matches ASCII case-insensitively and unicode as written", async () => {
      const s = await seeded();
      expect(await ids(s, "quarterly")).toEqual(["a6", "a8"]);
      expect(await ids(s, "日本")).toEqual(["a7"]);
    });

    it("filters by kind and pages by id after a cursor", async () => {
      const s = await seeded();
      await s.upsertNode(node("a9", { title: "quarterly team", kind: "team" }), 10);
      expect(await ids(s, "quarterly", { kinds: ["team"] })).toEqual(["a9"]);
      expect(await ids(s, "quarterly", { limit: 1 })).toEqual(["a6"]);
      expect(await ids(s, "quarterly", { limit: 1, after: "a6" })).toEqual(["a8"]);
      expect(await ids(s, "quarterly", { after: "a9" })).toEqual([]);
    });

    it("returns whole nodes, current version only, skips tombstones, reads asOf", async () => {
      const s = await seeded();
      await s.upsertNode(node("a6", { title: "annual plan" }), 20);
      await s.tombstone("t1", "a8", 20);
      expect(await ids(s, "quarterly")).toEqual([]);
      expect(await ids(s, "quarterly", { asOf: 15 })).toEqual(["a6", "a8"]);
      expect(await ids(s, "annual", { asOf: 15 })).toEqual([]);
      expect(await s.searchTitles("t1", { text: "annual", limit: 5 })).toEqual([node("a6", { title: "annual plan" })]);
    });

    it("never crosses tenants", async () => {
      const s = await seeded();
      await s.upsertNode(node("b1", { tenant: "t2", title: "quarterly other" }), 10);
      expect(await ids(s, "other")).toEqual([]);
      expect((await s.searchTitles("t2", { text: "other", limit: 5 })).map((n) => n.id)).toEqual(["b1"]);
    });
  });
