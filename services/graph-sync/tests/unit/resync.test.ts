import { describe, expect, it } from "vitest";
import { syncConnector } from "../../src/index.js";
import { counted } from "../count.js";
import { put, readers, setup } from "../helpers.js";

describe("re-sync", () => {
  it("writes nothing when nothing changed", async () => {
    const s = setup();
    put(s.root, "a.txt", ["ana"], ["eng"]);
    put(s.root, "b.txt", ["bo"]);
    await syncConnector(s.deps);
    const c = counted(s.store);
    const r = await syncConnector({ ...s.deps, store: c.store });
    expect(c.calls).toEqual({ upsertNode: 0, addEdge: 0, removeEdge: 0, tombstone: 0 });
    expect(r).toEqual({ nodes: 0, edges: 0, removed: 0, pages: 1, skipped: [] });
  });

  it("closes stale edges when the ACL narrows and keeps history", async () => {
    const s = setup();
    put(s.root, "a.txt", ["ana", "bo"], ["eng"]);
    await syncConnector(s.deps);
    s.now.jump(5000);
    put(s.root, "a.txt", ["ana"], []);
    await syncConnector(s.deps);
    expect(readers(s.store, "t1", "folder/a.txt")).toEqual(["ana"]);
    expect(readers(s.store, "t1", "folder/a.txt", 2000)).toEqual(["ana", "bo", "eng"]);
  });

  it("adds only the new edge when the ACL widens", async () => {
    const s = setup();
    put(s.root, "a.txt", ["ana"]);
    await syncConnector(s.deps);
    put(s.root, "a.txt", ["ana", "bo"]);
    const c = counted(s.store);
    const r = await syncConnector({ ...s.deps, store: c.store });
    expect(readers(s.store, "t1", "folder/a.txt")).toEqual(["ana", "bo"]);
    expect(c.calls.removeEdge).toBe(0);
    expect(r.edges).toBe(1);
  });
});
