import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { boot, dom, type Env, fileCount, ids } from "../support/app.js";
import { fid, members, pathOf, seedWorld, visibleIdx } from "../support/world.js";

let env: Env;
beforeAll(async () => {
  env = await boot();
  await seedWorld(env.store);
}, 120_000);
afterAll(async () => env.stop(), 120_000);

const alice = { tenant: "t1", user: "alice" };

describe("file detail and cluster browse", () => {
  it("detail shows up to three cluster paths, each with its why, drawn from the file's real clusters", async () => {
    const r = await env.call(`/files/${fid(30)}`, alice);
    expect(r.status).toBe(200);
    expect(members(30)).toHaveLength(4);
    const shown = members(30).filter((l) => r.body.includes(`Why l${l}`));
    expect(shown).toHaveLength(3);
    for (const l of shown) for (const name of pathOf(l)) expect(r.body).toContain(name);
    expect(r.body.match(/Why l\d+/g)).toHaveLength(3);
    expect(dom(r.body).body.textContent).toContain("Doc 030");
  });
  it("cluster tree shows all 40 clusters, level by level, with kind, why and a visible count", async () => {
    const t = await env.tree(alice);
    expect(t.size).toBe(40);
    for (const [id, row] of t) {
      expect(row.why).toBe(`Why ${id}`);
      expect(["place", "people", "topic"]).toContain(row.type);
      expect(Number.parseInt(row.count, 10)).toBeGreaterThan(0);
    }
    expect(t.get("l5")?.title).toBe("Leaf l5");
    for (const l of [...Array(24).keys()]) {
      const want = visibleIdx("alice").filter((i) => members(i).includes(l)).length;
      expect(Number.parseInt(t.get(`l${l}`)?.count ?? "", 10), `leaf l${l} count`).toBe(want);
      expect(t.get(`l${l}`)?.parent).toBe(`m${l % 12}`);
    }
    for (let m = 0; m < 12; m++) expect(t.get(`m${m}`)?.parent).toBe(`r${m % 4}`);
  });
  it("cluster members are exactly the visible files that belong to it, with its count", async () => {
    const want = visibleIdx("alice")
      .filter((i) => members(i).includes(0))
      .map(fid);
    const r = await env.call("/clusters/l0?limit=100", alice);
    expect(r.status).toBe(200);
    expect([...ids(r.body)].sort()).toEqual(want);
    expect(fileCount(r.body)).toBe(want.length);
    expect(r.body).toContain("Why l0");
  });
  it("a root's member list is the distinct visible files of its subtree", async () => {
    const want = visibleIdx("alice")
      .filter((i) => members(i).some((l) => (l % 12) % 4 === 1))
      .map(fid);
    const { ids: got } = await env.walk("/clusters/r1", alice);
    expect([...got].sort()).toEqual(want);
  });
  it("an unknown cluster id is 404", async () => {
    expect((await env.call("/clusters/nope", alice)).status).toBe(404);
  });
});
