import { describe, expect, it } from "vitest";
import { node } from "../../support/helpers.js";
import { type AsyncStore, factories, openOn } from "../../support/pg/factories.js";

// Both dialects must cut scanTitles into the same pages: same ids, same `truncated` flags. Candidates from another
// tenant, or titles that do not match, must not spend the `cap`: before the fix SQLite listed tenant t2's FTS hits
// (and, for needles under 3 characters, every t1 row, matching or not) and returned empty truncated pages Postgres never returns.
const seed = async (s: AsyncStore) => {
  // t2 goes first, so its rowids sit before every t1 row and would be the first candidates if not filtered.
  for (let i = 0; i < 40; i++) await s.upsertNode(node(`o${i}`, { tenant: "t2", title: `report other ${i}` }), 10);
  for (let k = 0; k < 6; k++) for (const word of ["budget", "plan", "report", "tree"]) await s.upsertNode(node(`${word}-${k}`, { title: `${word} ${k}` }), 10);
};
/** Every page of one scan as "<rows>" or "<rows>T" (truncated), plus the ids in order. */
const walk = async (s: AsyncStore, text: string) => {
  const shape: string[] = [];
  const ids: string[] = [];
  for (let cursor: number | undefined, n = 0; n < 200; n++) {
    const p = await s.scanTitles("t1", { text, limit: 2, cap: 3, ...(cursor === undefined ? {} : { cursor }) });
    shape.push(`${p.nodes.length}${p.truncated ? "T" : ""}`);
    ids.push(...p.nodes.map((x) => x.id));
    if (p.next === undefined) return { shape, ids };
    cursor = p.next;
  }
  throw new Error("did not finish");
};
// "report" uses the trigram index on SQLite, "re" (under 3 characters) the table walk.
const WANT = {
  report: ["2", "2", "2", "0"],
  re: ["2", "2", "2", "2", "2", "2", "0"],
};
const live = factories.filter((f) => f.skip === undefined);

describe("scanTitles page shapes", () => {
  for (const f of live)
    it.each(Object.keys(WANT))(`${f.name}: %j pages over this tenant's matches only`, async (text) => {
      const s = await openOn(f);
      await seed(s);
      const { shape, ids } = await walk(s, text);
      expect(shape).toEqual(WANT[text as keyof typeof WANT]);
      expect(ids.every((id) => /^(report|tree)-/.test(id))).toBe(true);
    });

  it.skipIf(live.length < 2).each(Object.keys(WANT))("%j: SQLite and Postgres return identical pages", async (text) => {
    const [a, b] = await Promise.all(live.map(async (f) => openOn(f)));
    for (const s of [a, b]) await seed(s as AsyncStore);
    expect(await walk(a as AsyncStore, text)).toEqual(await walk(b as AsyncStore, text));
  });
});
