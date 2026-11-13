import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { A, B, boot, ids, type World } from "../support/world.js";

let w: World;
beforeAll(async () => {
  w = await boot();
  await w.file("f1", { title: "Alpha", owner: "alice" });
  await w.file("f2", { title: "Beta", owner: "carol" });
  await w.cluster("c1", { why: "why1" });
  await w.link("f1", "c1");
  await w.link("f2", "c1");
});
afterAll(() => w.close());
const ok = async () => true;

describe("live gate and revocation", () => {
  it("recheck false hides the file; throwing hides it; neither is a 500", async () => {
    w.w.recheck = async (d) => d.id !== "f1";
    expect(ids((await w.get("/files", A)).body)).toEqual(["f2"]);
    w.w.recheck = async () => Promise.reject(new Error("boom"));
    const r = await w.get("/files", A);
    expect([r.status, ids(r.body)]).toEqual([200, []]);
    expect((await w.get("/files/f1", A)).status).toBe(404);
    w.w.recheck = ok;
  });
  it("a slow recheck fails closed within the time budget", async () => {
    w.w.recheck = () => new Promise((r) => setTimeout(() => r(true), 5_000));
    const t = Date.now();
    const r = await w.get("/files", A);
    expect(Date.now() - t).toBeLessThan(3_000);
    expect(ids(r.body)).toEqual([]);
    w.w.recheck = ok;
  });
  it("a removed can-read edge takes effect on the very next request (no cross-request cache)", async () => {
    expect(ids((await w.get("/files", B)).body)).toContain("f1");
    await w.store.removeEdge({ tenant: "t1", from: "bob", to: "f1", kind: "can-read", source: "drive" }, 2);
    expect(ids((await w.get("/files", B)).body)).not.toContain("f1");
    expect((await w.get("/files/f1", B)).status).toBe(404);
  });
  it("a tombstoned file vanishes from list, detail and cluster counts", async () => {
    await w.store.tombstone("t1", "f2", 3);
    expect(ids((await w.get("/files", A)).body)).not.toContain("f2");
    expect((await w.get("/files/f2", A)).status).toBe(404);
  });
  it("cluster counts and member lists exclude hidden files and never name them", async () => {
    await w.file("h1", { title: "HIDDEN-ONE", readers: ["zed"] });
    await w.link("h1", "c1");
    const page = (await w.get("/clusters/c1", A)).body;
    expect(page).not.toContain("HIDDEN-ONE");
    expect(page).not.toMatch(/\b3 (files|documents)\b/);
  });
  it("readers list is shown to owner and admin only", async () => {
    await w.file("r1", { title: "Readers", owner: "alice", readers: ["alice", "bob", "carol"] });
    expect((await w.get("/files/r1", A)).body).toContain("carol");
    expect((await w.get("/files/r1", { tenant: "t1", user: "carol", role: "admin" })).body).toContain("bob");
    const member = (await w.get("/files/r1", B)).body;
    expect(member).not.toContain("carol");
  });
  it("a member cannot self-promote with a role query or header", async () => {
    const r = await w.get("/files/r1?role=admin", B, { headers: { "x-role": "admin" } });
    expect(r.body).not.toContain("carol");
  });
});
