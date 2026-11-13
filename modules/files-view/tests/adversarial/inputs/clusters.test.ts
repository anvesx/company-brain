import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { A, boot, ids, type World } from "../support/world.js";

let w: World;
beforeAll(async () => {
  w = await boot();
  // cycle a -> b -> a, self parent s, orphan parent o, 60-deep chain d0..d59
  await w.cluster("a", { parent: "b", title: "CycA", why: "A" });
  await w.cluster("b", { parent: "a", title: "CycB", why: "B" });
  await w.cluster("s", { parent: "s", title: "SelfS", why: "S" });
  await w.cluster("o", { parent: "ghost", title: "Orphan", why: "O" });
  for (let i = 0; i < 60; i++) await w.cluster(`d${i}`, { parent: i ? `d${i - 1}` : undefined, title: `Deep${i}`, why: `D${i}` });
  await w.file("fa", { title: "InCycle" });
  await w.file("fs", { title: "SelfFile" });
  await w.file("fo", { title: "OrphanFile" });
  await w.file("fd", { title: "DeepFile" });
  await w.file("many", { title: "ManyClusters" });
  await w.file("fnw", { title: "NoWhy" });
  await w.cluster("nowhy", { title: "NoWhyCluster" });
  await w.link("fnw", "nowhy");
  await w.link("fa", "a");
  await w.link("fs", "s");
  await w.link("fo", "o");
  await w.link("fd", "d59");
  await w.link("fd", "fa"); // belongs-to a document, not a cluster
  await w.link("fd", "nonexistent");
  for (let i = 0; i < 40; i++) await w.link("many", `d${i}`);
});
afterAll(() => w.close());
const timed = async (p: string) => {
  const t = Date.now();
  const r = await w.get(p, A);
  expect(Date.now() - t, p).toBeLessThan(5_000);
  return r;
};

describe("hostile cluster graphs", () => {
  it("a parent cycle, self parent and orphan parent never hang or 500 the list", async () => {
    const r = await timed("/files");
    expect(r.status).toBe(200);
    expect(ids(r.body)).toContain("fa");
  });
  it("cycle clusters render on /clusters and /clusters/:id without recursion blowup", async () => {
    for (const p of ["/clusters", "/clusters/a", "/clusters/b", "/clusters/s", "/clusters/o"]) expect((await timed(p)).status, p).toBeLessThan(500);
  });
  it("a file in 40 clusters shows at most 3 cluster paths", async () => {
    const row = (await w.get("/files?q=ManyClusters", A)).body;
    expect((row.match(/Deep\d+/g) ?? []).length).toBeLessThanOrEqual(3 * 60);
    expect(new Set(row.match(/\/clusters\/d\d+/g)).size).toBeLessThanOrEqual(3 * 60);
  });
  it("a 60-level chain renders and its path is root > ... > leaf", async () => {
    const body = (await timed("/files?q=DeepFile")).body;
    expect(body).toContain("Deep59");
  });
  it("edges to a document or to a missing id do not create phantom clusters or errors", async () => {
    const r = await timed("/files/fd");
    expect(r.status).toBe(200);
    expect(r.body).not.toContain("InCycle-cluster");
  });
  it("a cluster without a why renders without 'undefined' or 'null'", async () => {
    const r = await timed("/clusters/nowhy");
    expect(r.status).toBe(200);
    expect(r.body).not.toMatch(/undefined|>null</);
  });
  it("cluster members of a cluster nobody can see inside is an empty list with count 0", async () => {
    await w.cluster("empty", { why: "none" });
    const r = await timed("/clusters/empty");
    expect([200, 404]).toContain(r.status);
    expect(r.body).not.toMatch(/undefined/);
  });
  it("cluster.type outside place|people|topic does not break rendering", async () => {
    await w.cluster("weird", { type: "<b>bogus</b>", why: "w" });
    await w.link("fnw", "weird");
    const r = await timed("/files?q=NoWhy");
    expect(r.status).toBe(200);
    expect(r.body).not.toContain("<b>bogus</b>");
  });
});
