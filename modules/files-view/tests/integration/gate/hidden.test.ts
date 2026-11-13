import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { boot, clusterRows, type Env, fileCount, ids, readersOf } from "../support/app.js";
import { doc } from "../support/world.js";

let env: Env;
const [T, v] = ["g1", { tenant: "g1", user: "v" }];
const gone = new Set(["dRecheckFalse"]); // its removed state (not a plain 404) is tested in removed.test.ts
beforeAll(async () => {
  env = await boot({
    recheck: async (d: { id: string }) => {
      if (d.id === "dRecheckThrows") throw new Error("source down");
      return !gone.has(d.id);
    },
  });
  const s = env.store;
  const node = (tenant: string, id: string, kind: "person" | "project", props: Record<string, string> = {}) =>
    s.upsertNode({ tenant, id, kind, source: "x", address: id, title: kind === "project" ? "Cluster one" : id, version: "1", props }, 1);
  for (const p of ["v", "w", "x"]) await node(T, p, "person");
  await node(T, "c1", "project", { "cluster.type": "topic", "cluster.why": "Same folder /a" });
  const files: [string, Record<string, string>, string][] = [
    ["dOk", {}, "v"],
    ["dZone", { zone: "team", team: "secret" }, "v"],
    ["dPersonalOther", { zone: "personal", owner: "w" }, "v"],
    ["dNoRead", {}, "w"],
    ["dRecheckFalse", {}, "v"],
    ["dRecheckThrows", {}, "v"],
    ["dOwn", { owner: "v" }, "v"],
  ];
  for (const [i, [id, props, reader]] of files.entries()) {
    await s.upsertNode(doc(T, id, i, { zone: "company", owner: "z", ...props }), 1);
    await s.addEdge({ tenant: T, from: reader, to: id, kind: "can-read", source: "t" }, 1);
    await s.addEdge({ tenant: T, from: id, to: "c1", kind: "belongs-to", source: "t" }, 1);
  }
  for (const [who, id] of [
    ["w", "dOwn"],
    ["x", "dOk"],
    ["x", "dOwn"],
  ] as const)
    await s.addEdge({ tenant: T, from: who, to: id, kind: "can-read", source: "t" }, 1);
  await s.upsertNode(doc("g2", "dOtherTenant", 9, { zone: "company" }), 1);
  await s.addEdge({ tenant: "g2", from: "v", to: "dOtherTenant", kind: "can-read", source: "t" }, 1);
}, 120_000);
afterAll(async () => env.stop(), 120_000);
const [SEEN, readers] = [["dOk", "dOwn"], (html: string) => readersOf(html) ?? ""] as const;
describe("the gate hides what the viewer may not read, on every path", () => {
  it("list shows only dOk and dOwn", async () => expect(ids((await env.call("/files", v)).body).sort()).toEqual(SEEN));
  it("search never finds hidden files", async () => {
    const r = await env.call("/files?q=Doc", v);
    expect(ids(r.body).sort()).toEqual(SEEN);
    expect(r.body).not.toMatch(/dZone|dNoRead|dRecheck|dOtherTenant|dPersonalOther/);
  });
  it("cluster members and count exclude hidden files", async () => {
    const c = await env.call("/clusters/c1", v);
    expect(fileCount(c.body)).toBe(2);
    expect(ids(c.body).sort()).toEqual(SEEN);
    const t = await env.call("/clusters", v);
    expect(t.body).toContain("Cluster one");
    expect(clusterRows(t.body).map((r) => [r.id, r.count])).toEqual([["c1", "2"]]);
  });
  it("detail of a visible file is 200", async () => expect((await env.call("/files/dOk", v)).status).toBe(200));
  it("hidden ids on detail are 404, identical to a missing id", async () => {
    const missing = await env.call("/files/does-not-exist", v);
    expect(missing.status).toBe(404);
    for (const id of ["dZone", "dNoRead", "dPersonalOther", "dOtherTenant", "dRecheckThrows"]) {
      const r = await env.call(`/files/${id}`, v);
      expect(r.status, id).toBe(404);
      expect(r.body.replaceAll(id, "X")).toBe(missing.body.replaceAll("does-not-exist", "X"));
    }
  });
  it("readers go to the owner and to an admin, never to other members", async () => {
    const owner = readers((await env.call("/files/dOwn", v)).body);
    for (const n of ["v", "w", "x"]) expect(owner).toMatch(new RegExp(`\\b${n}\\b`));
    const member = await env.call("/files/dOwn", { tenant: T, user: "w" });
    expect(member.status).toBe(200);
    expect(member.body).not.toMatch(/Readers/);
    expect((await env.call("/files/dOk", v)).body).not.toMatch(/Readers/);
    const admin = readers((await env.call("/files/dOk", { tenant: T, user: "x", role: "admin" })).body);
    expect(admin).toMatch(/\bv\b/);
  });
});
