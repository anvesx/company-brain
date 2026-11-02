import { describe, expect, it } from "vitest";
import { put, stack, TENANT } from "../../support/world.js";

describe("connector feed into graph, then rank", () => {
  it("indexes the documents the graph holds and a search returns their pointers", async () => {
    const s = stack();
    put(s.root, "plans/roadmap.md", "quarterly roadmap for payments", ["ana"]);
    put(s.root, "plans/budget.md", "quarterly budget review", ["ana"]);
    put(s.root, "misc/lunch.md", "pizza on friday", ["ana"]);

    const report = await s.sync();
    expect(report.nodes).toBeGreaterThanOrEqual(3);
    expect(report.skipped).toEqual([]);
    const diff = await s.index();
    expect(diff.created).toHaveLength(3);

    const hits = s.ix.search({ query: "quarterly", asker: { principals: ["user:ana"] } });
    expect(hits.map((h) => h.id).sort()).toEqual(["docs/plans/budget.md", "docs/plans/roadmap.md"]);
    expect(hits.map((h) => h.path).sort()).toEqual(["plans/budget.md", "plans/roadmap.md"]);
    for (const h of hits) expect(Object.keys(h).sort()).toEqual(["id", "path", "score", "signals"]);
    for (const h of hits) expect(s.store.node(TENANT, h.id)?.kind).toBe("document");
  });

  it("indexes an edited document by its new text on the next pass", async () => {
    const s = stack();
    put(s.root, "a.md", "alpha original", ["ana"]);
    await s.sync();
    await s.index();
    put(s.root, "a.md", "alpha rewritten with zebra", ["ana"]);
    await s.sync();
    const diff = await s.index();
    expect(diff.updated).toEqual(["docs/a.md"]);
    const ask = (query: string) => s.ix.search({ query, asker: { principals: ["user:ana"] } }).length;
    expect(ask("zebra")).toBe(1);
    expect(ask("original")).toBe(0);
  });
});
