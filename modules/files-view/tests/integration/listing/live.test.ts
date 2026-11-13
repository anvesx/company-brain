import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { boot, clusterRows, type Env, fileCount, ids } from "../support/app.js";
import { doc } from "../support/world.js";

// SPEC items 9 and 18: a cluster page re-applies the gate on every request (so a revoked edge or a tombstoned file vanishes
// at once, even right after the same page was served), and live source rechecks are capped per request.
let env: Env;
const calls: string[] = [];
const v = { tenant: "lv", user: "v" };
const node = (id: string, kind: "person" | "project", props: Record<string, string> = {}) =>
  env.store.upsertNode({ tenant: "lv", id, kind, source: "x", address: id, title: id, version: "1", props }, 1);
beforeAll(async () => {
  env = await boot({
    recheck: async (d: { id: string }) => {
      calls.push(d.id);
      return true;
    },
  });
  await node("v", "person");
  await node("c1", "project", { "cluster.type": "topic", "cluster.why": "Same folder /x" });
  for (let i = 0; i < 150; i++) {
    const id = `f${String(i).padStart(3, "0")}`;
    await env.store.upsertNode(doc("lv", id, i, { zone: "company", owner: "v" }), 1);
    await env.store.addEdge({ tenant: "lv", from: "v", to: id, kind: "can-read", source: "t" }, 1);
    if (i < 5) await env.store.addEdge({ tenant: "lv", from: id, to: "c1", kind: "belongs-to", source: "t" }, 1);
  }
}, 120_000);
afterAll(async () => env.stop(), 120_000);

describe("live rechecks are capped", () => {
  it("GET /files?limit=100 rechecks each distinct file at most once, 200 at most", async () => {
    calls.length = 0;
    const r = await env.call("/files?limit=100", v);
    expect(ids(r.body)).toHaveLength(100);
    expect(calls.length).toBeLessThanOrEqual(200);
    expect(calls.length).toBe(new Set(calls).size);
  });
  it("a cluster page and a detail page are capped the same way", async () => {
    calls.length = 0;
    await env.call("/clusters/c1", v);
    expect(calls.length).toBe(new Set(calls).size);
    calls.length = 0;
    await env.call("/files/f000", v);
    expect(calls.length).toBeLessThanOrEqual(2);
  });
});
describe("cluster pages re-apply the gate on every request", () => {
  const view = async () => {
    const tree = await env.call("/clusters", v);
    const page = await env.call("/clusters/c1", v);
    return { count: clusterRows(tree.body).find((r) => r.id === "c1")?.count, members: ids(page.body).sort(), n: fileCount(page.body) };
  };
  it("serves all 5 members, twice", async () => {
    for (let i = 0; i < 2; i++) expect(await view()).toMatchObject({ members: ["f000", "f001", "f002", "f003", "f004"], n: 5 });
  });
  it("a revoked can-read edge vanishes from members, count and tree at once", async () => {
    await env.store.removeEdge({ tenant: "lv", from: "v", to: "f001", kind: "can-read", source: "t" }, 2);
    expect(await view()).toMatchObject({ members: ["f000", "f002", "f003", "f004"], n: 4, count: "4" });
  });
  it("a tombstoned file vanishes at once, and from the list", async () => {
    await env.store.tombstone("lv", "f002", 3);
    expect(await view()).toMatchObject({ members: ["f000", "f003", "f004"], n: 3, count: "3" });
    expect(ids((await env.call("/files?limit=100", v)).body)).not.toContain("f002");
    expect((await env.call("/files/f002", v)).status).toBe(404);
  });
});
