import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { boot, clusterRows, dom, type Env, ids } from "../support/app.js";
import { bulk, doc } from "../support/world.js";

let revoked = new Set<string>();
let env: Env;
const me = { tenant: "r", user: "alice" };
beforeAll(async () => {
  env = await boot({ recheck: async (d: { id: string }) => !revoked.has(d.id) });
  const s = env.store;
  const cl = (id: string, title: string, type: string, why: string, parent?: string) => ({
    tenant: "r",
    id,
    kind: "project" as const,
    source: "brain",
    address: "c",
    title,
    version: "1",
    props: { "cluster.type": type, "cluster.why": why, ...(parent ? { "cluster.parent": parent } : {}) },
  });
  await s.upsertNode(cl("root", "Finance", "place", "Same folder /finance/q3"), 1);
  await s.upsertNode(cl("kid", "Q3 close", "topic", "Titles share the word close", "root"), 1);
  await s.upsertNode(doc("r", "f1", 1, { zone: "company", owner: "alice" }), 1);
  await s.addEdge({ tenant: "r", from: "alice", to: "f1", kind: "can-read", source: "t" }, 1);
  await s.addEdge({ tenant: "r", from: "f1", to: "kid", kind: "belongs-to", source: "t" }, 1);
  await bulk(env.pool, "r", "m", 150, (i) => ({
    title: `Many ${i}`,
    props: { owner: "alice", zone: "company", mime: "text/plain", size: "5", modified: "2026-01-01T00:00:00Z" },
  }));
}, 120_000);
afterAll(async () => env.stop(), 120_000);

describe("rendered screens", () => {
  it("one table row per file with title, source, owner, modified, size and the path chips", async () => {
    const r = await env.call("/files?q=Doc%20001", me);
    const rows = dom(r.body).querySelectorAll("tbody tr");
    expect(rows).toHaveLength(1);
    const text = rows[0]?.textContent ?? "";
    for (const part of ["Doc 001", "notion", "alice", "2026-10-01", "38 B", "Finance", "Q3 close"]) expect(text).toContain(part);
    expect(dom(r.body).querySelector("table")).not.toBeNull();
    expect(dom(r.body).querySelectorAll("thead th").length).toBeGreaterThanOrEqual(5);
  });
  it("shows why a cluster exists, on the row, the detail and the cluster page", async () => {
    for (const p of ["/files?q=Doc%20001", "/files/f1", "/clusters/kid", "/clusters"])
      expect((await env.call(p, me)).body).toContain("Titles share the word close");
    expect((await env.call("/clusters", me)).body).toContain("Same folder /finance/q3");
  });
  it("the cluster tree nests the child under its parent, and the child page links back up", async () => {
    const rows = clusterRows((await env.call("/clusters", me)).body);
    expect(rows.map((r) => [r.id, r.parent, r.count])).toEqual([
      ["root", "", "1"],
      ["kid", "root", "1"],
    ]);
    expect(dom((await env.call("/clusters/kid", me)).body).querySelector('a[href="/clusters/root"]')).not.toBeNull();
  });
  it("shows an empty state for a viewer with no files", async () => {
    const r = await env.call("/files", { tenant: "r", user: "nobody" });
    expect(r.status).toBe(200);
    expect(r.body).toMatch(/No files yet/);
    expect(ids(r.body)).toEqual([]);
    const none = await env.call("/files?q=zzzz-no-such-title", me);
    expect(none.body).toMatch(/No files match these filters/);
    expect(none.body).toContain('href="/files"');
  });
  it("the source revoking access shows a removed state or a 404, never the metadata", async () => {
    expect((await env.call("/files/f1", me)).status).toBe(200);
    revoked = new Set(["f1"]);
    const r = await env.call("/files/f1", me);
    expect(r.status).toBe(404);
    expect(r.body).toMatch(/removed, or you no longer have access/);
    expect(dom(r.body).querySelector("main section")?.textContent).not.toMatch(/Doc 001|notion|alice/); // the nav still names the viewer
    expect(ids((await env.call("/files?q=Doc%20001", me)).body)).toEqual([]);
    revoked = new Set();
  });
});
