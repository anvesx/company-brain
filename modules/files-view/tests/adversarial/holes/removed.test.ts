import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { A, boot, type World } from "../support/world.js";

let w: World;
const norm = (r: { status: number; headers: Headers; body: string }, id: string) => ({
  status: r.status,
  body: r.body.replaceAll(id, "ID"),
  headers: [...r.headers.entries()].filter(([k]) => !["date", "content-length"].includes(k)).sort(),
  length: r.body.replaceAll(id, "ID").length,
});
beforeAll(async () => {
  w = await boot();
  await w.file("revoked", { title: "RevokedDoc", readers: ["carol"] });
  await w.file("zoned", { title: "ZonedDoc", zone: "personal", owner: "zed" });
  await w.file("gone", { title: "GoneDoc" });
  await w.file("stale", { title: "StaleDoc" });
  await w.file("seen", { title: "Seen" });
  await w.file("slow", { title: "SlowDoc", owner: "olga" });
  await w.cluster("revcl-zz", { title: "RevokedCl", why: "w" });
  await w.link("revoked", "revcl-zz");
  await w.cluster("stalecl-zz", { title: "StaleCl", why: "w" });
  await w.link("stale", "stalecl-zz");
  await w.store.tombstone("t1", "gone", 2);
  w.w.recheck = async (d) => d.id !== "stale" && d.id !== "slow";
});
afterAll(() => w.close());

describe("never-had-access viewer cannot tell revoked from nonexistent", () => {
  it("file detail: status, headers and body are identical for hidden, revoked, tombstoned, and unknown ids", async () => {
    const base = norm(await w.get("/files/nonexistent", A), "nonexistent");
    for (const id of ["revoked", "zoned", "gone", "x".repeat(300)]) {
      expect(norm(await w.get(`/files/${id}`, A), id), id).toEqual(base);
    }
  });
  it("cluster detail: a cluster holding only hidden/rechecked-false files equals a missing cluster", async () => {
    const base = norm(await w.get("/clusters/nonexistent", A), "nonexistent");
    for (const id of ["revcl-zz", "stalecl-zz"]) expect(norm(await w.get(`/clusters/${id}`, A), id), id).toEqual(base);
  });
  it("JSON responses of hidden and missing are identical too", async () => {
    const h = { headers: { accept: "application/json" } };
    const base = norm(await w.get("/files/nonexistent", A, h), "nonexistent");
    expect(norm(await w.get("/files/revoked", A, h), "revoked")).toEqual(base);
  });
  it("the removed text never appears for a file that was never visible", async () => {
    expect((await w.get("/files/revoked", A)).body).toBe((await w.get("/files/revoked", A)).body);
    expect((await w.get("/files/revoked", A)).body).not.toContain("RevokedDoc");
  });
});

describe("a viewer with a can-read edge whose recheck cleanly says false (ruling: SPEC wins)", () => {
  it("gets 404 and the removed page with no file metadata in body or headers", async () => {
    const r = await w.get("/files/stale", A);
    expect(r.status).toBe(404);
    expect(r.body).toContain("Access removed");
    const all = r.body + JSON.stringify([...r.headers.entries()]);
    for (const leak of ["StaleDoc", "stalecl-zz", "StaleCl", "text/plain", "a/stale"]) expect(all).not.toContain(leak);
  });
  it("the same file with a recheck that throws is byte-identical to a missing id", async () => {
    w.w.recheck = async (d) => {
      if (d.id === "slow") throw new Error("source down");
      return true;
    };
    expect(norm(await w.get("/files/slow", A), "slow")).toEqual(norm(await w.get("/files/nonexistent", A), "nonexistent"));
  });
  it("the same file with a recheck that times out is byte-identical to a missing id", async () => {
    w.w.recheck = (d) => (d.id === "slow" ? new Promise<boolean>(() => undefined) : Promise.resolve(true));
    expect(norm(await w.get("/files/slow", A), "slow")).toEqual(norm(await w.get("/files/nonexistent", A), "nonexistent"));
  }, 15_000);
});
