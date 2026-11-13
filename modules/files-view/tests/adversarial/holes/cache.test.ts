import { setFlagsFromString } from "node:v8";
import { runInNewContext } from "node:vm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { A, B, boot, type World, X } from "../support/world.js";

let w: World;
const json = { headers: { accept: "application/json" } };
const names = async (c: Parameters<World["get"]>[1]) =>
  (JSON.parse((await w.get("/clusters", c, json)).body) as { clusters: { id: string; count: number }[] }).clusters.map((k) => `${k.id}:${k.count}`);
beforeAll(async () => {
  w = await boot();
  await w.cluster("c1", { title: "C1", why: "w" });
  await w.file("f1", { title: "F1", readers: ["alice"] });
  await w.file("f2", { title: "F2", readers: ["alice", "bob"] });
  await w.link("f1", "c1");
  await w.link("f2", "c1");
  await w.cluster("cx", { tenant: "t2", title: "CX", why: "w" });
  await w.file("fx", { tenant: "t2", title: "FX", owner: "alice", readers: ["alice"] });
  await w.link("fx", "cx", "t2");
});
afterAll(() => w.close());

describe("viewer-specific cluster cache", () => {
  it("viewers do not share counts: alice 2, bob 1, carol none", async () => {
    expect(await names(A)).toEqual(["c1:2"]);
    expect(await names(B)).toEqual(["c1:1"]);
    expect(await names({ tenant: "t1", user: "carol" })).toEqual([]);
    expect(await names(A)).toEqual(["c1:2"]);
  });
  it("same user name in another tenant gets that tenant's tree only", async () => {
    expect(await names({ tenant: "t2", user: "alice" })).toEqual(["cx:1"]);
    expect(await names(A)).toEqual(["c1:2"]);
    expect(await names(X)).toEqual([]);
  });
  it("a grant shows on the next /clusters and a revoke hides on the next one", async () => {
    await w.store.addEdge({ tenant: "t1", from: "bob", to: "f1", kind: "can-read", source: "drive" }, 5);
    expect(await names(B)).toEqual(["c1:2"]);
    await w.store.removeEdge({ tenant: "t1", from: "bob", to: "f1", kind: "can-read", source: "drive" }, 6);
    await w.store.removeEdge({ tenant: "t1", from: "bob", to: "f2", kind: "can-read", source: "drive" }, 6);
    expect(await names(B)).toEqual([]);
    expect((await w.get("/clusters/c1", B)).status).toBe(404);
  });
  it("a recheck flip and a new file are visible on the very next request", async () => {
    w.w.recheck = async (d) => d.id !== "f1";
    expect(await names(A)).toEqual(["c1:1"]);
    w.w.recheck = async () => true;
    await w.file("f3", { title: "F3", readers: ["alice"] });
    await w.link("f3", "c1");
    expect(await names(A)).toEqual(["c1:3"]);
    await w.store.removeEdge({ tenant: "t1", from: "f3", to: "c1", kind: "belongs-to", source: "brain" }, 7);
    expect(await names(A)).toEqual(["c1:2"]);
    expect((await w.get("/files?cluster=c1", A)).body).not.toContain("F3");
  });
  it("a tombstoned cluster disappears from tree, chips and member filter", async () => {
    await w.store.tombstone("t1", "c1", 8);
    expect(await names(A)).toEqual([]);
    expect((await w.get("/files/f1", A)).body).not.toContain(">C1<");
    expect((await w.get("/clusters/c1", A)).status).toBe(404);
  });
  it("2000 distinct viewers do not grow the heap without bound (bounded cache)", async () => {
    await w.cluster("big", { title: "Big", why: "w" });
    await w.file("bf", { title: "BF", readers: Array.from({ length: 2000 }, (_, i) => `v${i}`) });
    await w.link("bf", "big");
    setFlagsFromString("--expose_gc");
    const gc = runInNewContext("gc") as () => void;
    gc();
    const before = process.memoryUsage().heapUsed;
    for (let i = 0; i < 2000; i += 20) await Promise.all(Array.from({ length: 20 }, (_, j) => w.get("/clusters", { tenant: "t1", user: `v${i + j}` }, json)));
    gc();
    expect(process.memoryUsage().heapUsed - before).toBeLessThan(40 * 1024 * 1024);
  }, 180_000);
});
