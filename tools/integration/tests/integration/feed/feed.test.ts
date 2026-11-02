import { describe, expect, it } from "vitest";
import { put, stack, TENANT } from "../../support/world.js";

const ids = (docs: { id: string }[]) => docs.map((d) => d.id).sort();

describe("connector feed into the graph, then the listing rag indexes", () => {
  it("lists the documents the graph holds with address, version and readers", async () => {
    const s = stack();
    put(s.root, "plans/roadmap.md", "quarterly roadmap for payments", ["ana"]);
    put(s.root, "plans/budget.md", "quarterly budget review", ["ana", "bob"]);
    put(s.root, "misc/lunch.md", "pizza on friday", ["ana"]);

    const report = await s.sync();
    expect(report.nodes).toBeGreaterThanOrEqual(3);
    expect(report.skipped).toEqual([]);
    const docs = s.docs();
    expect(ids(docs)).toEqual(["docs/misc/lunch.md", "docs/plans/budget.md", "docs/plans/roadmap.md"]);
    const budget = docs.find((d) => d.id === "docs/plans/budget.md");
    expect(budget?.address).toBe("plans/budget.md");
    expect(budget?.readers).toEqual(["user:ana", "user:bob"]);
    expect(budget?.version.length).toBeGreaterThan(0);
    for (const d of docs) expect(s.store.node(TENANT, d.id)?.kind).toBe("document");
  });

  it("lists an edited document under a new version on the next pass", async () => {
    const s = stack();
    put(s.root, "a.md", "alpha original", ["ana"]);
    await s.sync();
    const before = s.docs()[0]?.version;
    put(s.root, "a.md", "alpha rewritten with zebra", ["ana"]);
    await s.sync();
    const after = s.docs();
    expect(after).toHaveLength(1);
    expect(after[0]?.version).not.toBe(before);
  });
});
