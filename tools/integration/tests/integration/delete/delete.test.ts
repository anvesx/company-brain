import { rmSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { put, stack, TENANT } from "../../support/world.js";

describe("delete propagates from the source to search", () => {
  it("a deleted document is tombstoned in the graph and no longer searchable", async () => {
    const s = stack();
    put(s.root, "keep.md", "launch checklist", ["ana"]);
    put(s.root, "gone.md", "launch secrets", ["ana"]);
    await s.sync();
    await s.index();
    const ask = (q: string) => s.ix.search({ query: q, asker: { principals: ["user:ana"] } }).map((h) => h.id);
    expect(ask("launch").sort()).toEqual(["docs/gone.md", "docs/keep.md"]);

    rmSync(join(s.root, "gone.md"));
    rmSync(join(s.root, "gone.md.acl.json"));
    const report = await s.sync();
    expect(report.removed).toBe(1);
    expect(s.store.node(TENANT, "docs/gone.md")).toBeUndefined();
    expect(s.store.history(TENANT, "docs/gone.md")).toHaveLength(1);
    expect(s.store.neighbors(TENANT, "docs/gone.md", { kind: "can-read" })).toEqual([]);

    const diff = await s.index();
    expect(diff.deleted).toEqual(["docs/gone.md"]);
    expect(ask("launch")).toEqual(["docs/keep.md"]);
    expect(ask("secrets")).toEqual([]);
  });

  it("without the graph pass the index still holds the document (the feed is the only path)", async () => {
    const s = stack();
    put(s.root, "x.md", "orphan text", ["ana"]);
    await s.sync();
    await s.index();
    rmSync(join(s.root, "x.md"));
    rmSync(join(s.root, "x.md.acl.json"));
    const diff = await s.index();
    expect(diff.deleted).toEqual([]);
    expect(s.ix.search({ query: "orphan", asker: { principals: ["user:ana"] } })).toHaveLength(1);
  });
});
