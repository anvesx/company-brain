import { join } from "node:path";
import { createGraphStore } from "@anvesx/graph-store";
import { describe, expect, it } from "vitest";
import { syncConnector } from "../../src/index.js";
import { drop, openStore, put, readers, setup, tmp } from "../helpers.js";

describe("folder connector into a graph file", () => {
  it("answers reach and neighbors after sync, mutation and re-sync", async () => {
    const s = setup();
    put(s.root, "docs/plan.md", ["ana"], ["eng"]);
    put(s.root, "docs/notes.md", ["bo"]);
    put(s.root, "top.md", [], ["eng"]);
    await syncConnector(s.deps, { pageSize: 2 });
    const reach = (from: string) =>
      s.store
        .reach("t1", from, { kinds: ["can-read"], depth: 1, limit: 50 })
        .map((n) => n.id)
        .sort();
    expect(reach("ana")).toEqual(["folder/docs/plan.md"]);
    expect(reach("eng")).toEqual(["folder/docs/plan.md", "folder/top.md"]);
    expect(s.store.neighbors("t1", "bo", { kind: "can-read", dir: "out" })).toHaveLength(1);

    s.now.jump(50_000);
    put(s.root, "docs/plan.md", ["ana"], []);
    drop(s.root, "docs/notes.md");
    put(s.root, "new.md", ["bo"]);
    const r = await syncConnector(s.deps, { pageSize: 2 });
    expect(r.removed).toBe(1);
    expect(reach("eng")).toEqual(["folder/top.md"]);
    expect(reach("bo")).toEqual(["folder/new.md"]);
    expect(readers(s.store, "t1", "folder/docs/plan.md")).toEqual(["ana"]);
    expect(s.store.reach("t1", "eng", { kinds: ["can-read"], depth: 1, limit: 50, asOf: 2000 })).toHaveLength(2);
  });

  it("persists across a reopened store file", async () => {
    const path = join(tmp(), "g.db");
    const first = openStore(path);
    const s = setup("t1", first);
    put(s.root, "a.txt", ["ana"]);
    await syncConnector(s.deps);
    first.close();
    const again = createGraphStore({ path });
    try {
      expect(readers(again, "t1", "folder/a.txt")).toEqual(["ana"]);
      const r = await syncConnector({ ...s.deps, store: again });
      expect(r).toEqual({ nodes: 0, edges: 0, removed: 0, pages: 1, skipped: [] });
    } finally {
      again.close();
    }
  });

  it("syncs two tenants through separate handles on one file", async () => {
    const path = join(tmp(), "g.db");
    const h1 = openStore(path);
    const h2 = openStore(path);
    const a = setup("ta", h1);
    const b = setup("tb", h2);
    for (let i = 0; i < 20; i++) {
      put(a.root, `d${i}.txt`, ["ana", `a${i}`]);
      put(b.root, `d${i}.txt`, ["bo", `b${i}`]);
    }
    await Promise.all([syncConnector(a.deps, { pageSize: 5 }), syncConnector(b.deps, { pageSize: 5 })]);
    expect(readers(h1, "ta", "folder/d7.txt")).toEqual(["a7", "ana"]);
    expect(readers(h2, "tb", "folder/d7.txt")).toEqual(["b7", "bo"]);
    expect(readers(h1, "tb", "folder/d7.txt")).toEqual(["b7", "bo"]);
  });
});
