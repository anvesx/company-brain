import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { A, B, boot, ids, type World, X } from "../support/world.js";

let w: World;
beforeAll(async () => {
  w = await boot();
  await w.file("mine", { title: "Mine" });
  await w.file("theirs", { tenant: "t2", title: "SECRET-T2", readers: ["xena", "alice"], owner: "xena" });
  await w.file("bobs", { title: "BobPersonal", zone: "personal", owner: "bob" });
  await w.file("teamz", { title: "TeamOnly", zone: "team", props: { team: "eng" } });
  await w.file("noacl", { title: "NoAcl", readers: [] });
  await w.file("nozone", { title: "NoZone", props: { zone: "" } });
  await w.cluster("c1", { title: "Mine-C", why: "Same folder /a" });
  await w.cluster("cx", { tenant: "t2", title: "T2-CLUSTER", why: "T2 WHY" });
  await w.link("mine", "c1");
  await w.link("mine", "cx"); // edge in t1 pointing at a t2 cluster id
  await w.link("theirs", "cx", "t2");
});
afterAll(() => w.close());

describe("tenant and zone isolation", () => {
  it("lists only gate-approved rows for alice", async () => {
    const r = await w.get("/files", A);
    expect(ids(r.body).sort()).toEqual(["mine"]);
  });
  it("never shows t2 data in list, search, detail, clusters", async () => {
    for (const p of ["/files", "/files?q=SECRET", "/files/theirs", "/clusters", "/clusters/cx", "/clusters/cx/members"]) {
      const r = await w.get(p, A);
      expect(r.body, p).not.toMatch(/SECRET-T2|T2-CLUSTER|T2 WHY/);
    }
  });
  it("cross-tenant edge does not leak the foreign cluster into chips", async () => {
    expect((await w.get("/files", A)).body).not.toMatch(/T2-CLUSTER|T2 WHY/);
  });
  it("ignores tenant spoofing via header, query or cookie", async () => {
    const h = { "x-tenant": "t2", "x-forwarded-user": "xena", cookie: "tenant=t2" };
    const r = await w.get("/files?tenant=t2&user=xena", A, { headers: h });
    expect(r.body).not.toMatch(/SECRET-T2/);
  });
  it("other tenant sees only its own file", async () => {
    expect(ids((await w.get("/files", X)).body)).toEqual(["theirs"]);
  });
  it("hides other user's personal zone, unjoined team, no-ACL and zone-less files", async () => {
    const body = (await w.get("/files", A)).body;
    for (const t of ["BobPersonal", "TeamOnly", "NoAcl", "NoZone"]) expect(body).not.toContain(t);
    expect(ids((await w.get("/files", B)).body)).toContain("bobs");
  });
  it("hidden detail is byte-identical to a missing id (404)", async () => {
    const hidden = await w.get("/files/theirs", A);
    const missing = await w.get("/files/nope-nope", A);
    expect([hidden.status, missing.status]).toEqual([404, 404]);
    expect(hidden.body.replaceAll("theirs", "X")).toBe(missing.body.replaceAll("nope-nope", "X"));
    for (const id of ["bobs", "teamz", "noacl", "nozone"]) expect((await w.get(`/files/${id}`, A)).status).toBe(404);
  });
  it("a cluster id is not a file and a file id is not a cluster", async () => {
    expect((await w.get("/files/c1", A)).status).toBe(404);
    expect((await w.get("/clusters/mine", A)).status).toBe(404);
  });
});
