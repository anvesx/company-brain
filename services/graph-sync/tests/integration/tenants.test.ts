import { describe, expect, it } from "vitest";
import { syncConnector } from "../../src/index.js";
import { drop, openStore, put, readers, setup } from "../helpers.js";

describe("tenants", () => {
  it("does not collide when two tenants sync the same address at once", async () => {
    const store = openStore();
    const a = setup("ta", store);
    const b = setup("tb", store);
    put(a.root, "same.txt", ["ana"]);
    put(b.root, "same.txt", ["bo"], ["eng"]);
    const [ra, rb] = await Promise.all([syncConnector(a.deps), syncConnector(b.deps)]);
    expect(readers(store, "ta", "folder/same.txt")).toEqual(["ana"]);
    expect(readers(store, "tb", "folder/same.txt")).toEqual(["bo", "eng"]);
    expect(store.node("ta", "bo")).toBeUndefined();
    expect(ra.removed + rb.removed).toBe(0);
  });

  it("tombstones in one tenant leave the other intact", async () => {
    const store = openStore();
    const a = setup("ta", store);
    const b = setup("tb", store);
    put(a.root, "same.txt", ["ana"]);
    put(b.root, "same.txt", ["ana"]);
    await Promise.all([syncConnector(a.deps), syncConnector(b.deps)]);
    drop(a.root, "same.txt");
    expect((await syncConnector(a.deps)).removed).toBe(1);
    expect(store.node("ta", "folder/same.txt")).toBeUndefined();
    expect(store.node("tb", "folder/same.txt")).toBeDefined();
    expect(readers(store, "tb", "folder/same.txt")).toEqual(["ana"]);
  });
});
