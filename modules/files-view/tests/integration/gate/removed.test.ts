import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { boot, type Env, ids } from "../support/app.js";
import { doc } from "../support/world.js";

// The rule under test (SPEC item 15, SWARM episode 1): a viewer who HAS a can-read edge to a file whose source then says no
// (recheck false) gets the removed state; everyone else (never had access, other tenant, recheck threw, id absent) gets the
// generic 404 that is byte-identical to a missing id. Neither page shows any metadata.
let env: Env;
const revoked = new Set<string>();
const v = { tenant: "r1", user: "v" };
beforeAll(async () => {
  env = await boot({
    recheck: async (d: { id: string }) => {
      if (d.id === "rThrows") throw new Error("source down");
      return !revoked.has(d.id);
    },
  });
  const s = env.store;
  for (const p of ["v", "w"]) await s.upsertNode({ tenant: "r1", id: p, kind: "person", source: "x", address: p, title: p, version: "1", props: {} }, 1);
  for (const [i, id] of ["rLive", "rRevoked", "rThrows", "rNoEdge"].entries()) {
    await s.upsertNode(doc("r1", id, i, { zone: "company", owner: "z", folder: "/secret-folder" }), 1);
    await s.addEdge({ tenant: "r1", from: id === "rNoEdge" ? "z" : "v", to: id, kind: "can-read", source: "t" }, 1);
  }
}, 120_000);
afterAll(async () => env.stop(), 120_000);
const strip = (body: string, id: string) => body.replaceAll(id, "X");

describe("detail route for revoked and hidden files, over real HTTP", () => {
  it("serves the file while the source allows it", async () => {
    const r = await env.call("/files/rRevoked", v);
    expect(r.status).toBe(200);
    expect(r.body).toContain("/secret-folder");
  });
  it("shows the removed state, with no metadata, once the recheck says no", async () => {
    revoked.add("rRevoked");
    const r = await env.call("/files/rRevoked", v);
    expect(r.status).toBe(404);
    expect(r.body).toContain("Access removed");
    expect(r.body).not.toMatch(/secret-folder|Doc 0|src\.example|Readers/);
    expect(r.headers.get("cache-control")).toMatch(/no-store/);
    expect(r.headers.get("content-security-policy")).toBeTruthy();
  });
  it("drops the revoked file from list, search and counts at the same time", async () => {
    expect(ids((await env.call("/files", v)).body)).toEqual(["rLive"]);
    expect(ids((await env.call("/files?q=Doc", v)).body)).toEqual(["rLive"]);
  });
  it("a viewer who never had access cannot tell revoked from missing", async () => {
    const missing = await env.call("/files/does-not-exist", { tenant: "r1", user: "w" });
    for (const id of ["rRevoked", "rNoEdge"]) {
      const r = await env.call(`/files/${id}`, { tenant: "r1", user: "w" });
      expect(r.status, id).toBe(missing.status);
      expect(r.body).not.toContain("Access removed");
      expect(strip(r.body, id)).toBe(strip(missing.body, "does-not-exist"));
      expect([...r.headers.keys()].sort()).toEqual([...missing.headers.keys()].sort());
    }
  });
  it("a source that errors fails closed as a plain 404, never as removed", async () => {
    const r = await env.call("/files/rThrows", v);
    const missing = await env.call("/files/does-not-exist", v);
    expect(r.status).toBe(404);
    expect(r.body).not.toContain("Access removed");
    expect(strip(r.body, "rThrows")).toBe(strip(missing.body, "does-not-exist"));
  });
  it("a missing id shows the plain 404, not the removed state", async () => {
    const r = await env.call("/files/does-not-exist", v);
    expect(r.status).toBe(404);
    expect(r.body).not.toContain("Access removed");
  });
  it("access restored: the same file is served again", async () => {
    revoked.delete("rRevoked");
    expect((await env.call("/files/rRevoked", v)).status).toBe(200);
  });
});
