import { describe, expect, it } from "vitest";
import { syncConnector } from "../../../src/index.js";
import { drop, put, readers, setup } from "../../helpers.js";

describe("tombstones", () => {
  it("tombstones documents missing from the listing", async () => {
    const s = setup();
    put(s.root, "a.txt", ["ana"]);
    put(s.root, "b.txt", ["ana"]);
    await syncConnector(s.deps);
    drop(s.root, "b.txt");
    s.now.jump(9000);
    const r = await syncConnector(s.deps);
    expect(r.removed).toBe(1);
    expect(s.store.node("t1", "folder/b.txt")).toBeUndefined();
    expect(s.store.node("t1", "folder/b.txt", 2000)?.id).toBe("folder/b.txt");
    expect(readers(s.store, "t1", "folder/b.txt")).toEqual([]);
    expect(s.store.node("t1", "folder/a.txt")).toBeDefined();
    expect((await syncConnector(s.deps)).removed).toBe(0);
  });

  it("revives a document that comes back", async () => {
    const s = setup();
    put(s.root, "a.txt", ["ana"]);
    await syncConnector(s.deps);
    drop(s.root, "a.txt");
    await syncConnector(s.deps);
    expect(s.store.node("t1", "folder/a.txt")).toBeUndefined();
    put(s.root, "a.txt", ["ana"]);
    await syncConnector(s.deps);
    expect(s.store.node("t1", "folder/a.txt")).toBeDefined();
    expect(readers(s.store, "t1", "folder/a.txt")).toEqual(["ana"]);
  });

  it("handles an empty listing", async () => {
    const s = setup();
    const r = await syncConnector(s.deps);
    expect(r.removed).toBe(0);
    expect(r.pages).toBe(1);
  });

  it("tombstones everything when the source becomes empty", async () => {
    const s = setup();
    put(s.root, "a.txt", ["ana"]);
    await syncConnector(s.deps);
    drop(s.root, "a.txt");
    expect((await syncConnector(s.deps)).removed).toBe(1);
    expect(s.store.node("t1", "folder/a.txt")).toBeUndefined();
  });

  it("does not tombstone documents of another connector", async () => {
    const s = setup();
    put(s.root, "a.txt");
    await syncConnector(s.deps);
    const other = setup("t1", s.store);
    put(other.root, "z.txt");
    await syncConnector({ ...other.deps, connector: { ...other.connector, id: "other" } });
    expect((await syncConnector(s.deps)).removed).toBe(0);
    expect(s.store.node("t1", "other/z.txt")).toBeDefined();
  });
});
