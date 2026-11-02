import { rmSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { put, stack, TENANT } from "../../support/world.js";

describe("delete propagates from the source to the listing", () => {
  it("a deleted document is tombstoned in the graph and leaves the listing", async () => {
    const s = stack();
    put(s.root, "keep.md", "launch checklist", ["ana"]);
    put(s.root, "gone.md", "launch secrets", ["ana"]);
    await s.sync();
    expect(
      s
        .docs()
        .map((d) => d.id)
        .sort(),
    ).toEqual(["docs/gone.md", "docs/keep.md"]);

    rmSync(join(s.root, "gone.md"));
    rmSync(join(s.root, "gone.md.acl.json"));
    const report = await s.sync();
    expect(report.removed).toBe(1);
    expect(s.store.node(TENANT, "docs/gone.md")).toBeUndefined();
    expect(s.store.history(TENANT, "docs/gone.md")).toHaveLength(1);
    expect(s.store.neighbors(TENANT, "docs/gone.md", { kind: "can-read" })).toEqual([]);
    expect(s.docs().map((d) => d.id)).toEqual(["docs/keep.md"]);
  });

  it("without the graph pass the listing still holds the document (the feed is the only path)", async () => {
    const s = stack();
    put(s.root, "x.md", "orphan text", ["ana"]);
    await s.sync();
    rmSync(join(s.root, "x.md"));
    rmSync(join(s.root, "x.md.acl.json"));
    expect(s.docs().map((d) => d.id)).toEqual(["docs/x.md"]);
  });
});
