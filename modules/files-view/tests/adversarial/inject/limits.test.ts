import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { A, boot, ids, type World } from "../support/world.js";

let w: World;
beforeAll(async () => {
  w = await boot();
  await w.bulk(250, (i) => ({
    title: `T${i}`,
    props: { owner: "alice", zone: "company", mime: "text/plain", size: String(i), modified: "2026-01-01T00:00:00Z" },
  }));
});
afterAll(() => w.close());

describe("limits and validation", () => {
  it("page size is capped at 100 even when asked for more", async () => {
    for (const l of ["101", "1000", "99999999999", "1e9"]) {
      const r = await w.get(`/files?limit=${l}`, A);
      expect(r.status, l).toBeLessThan(500);
      if (r.status === 200) expect(ids(r.body).length, l).toBeLessThanOrEqual(100);
    }
  });
  it("bad limits are 400, not 500, not unbounded", async () => {
    for (const l of ["0", "-1", "abc", "1.5", "", "NaN", "0x10", "%00"]) {
      const s = (await w.get(`/files?limit=${l}`, A)).status;
      expect([200, 400], l).toContain(s);
    }
    expect((await w.get("/files?limit=-1", A)).status).toBe(400);
    expect((await w.get("/files?limit=abc", A)).status).toBe(400);
  });
  it("search length is capped (10k chars is 400, not a 500 or a slow scan)", async () => {
    const t = Date.now();
    expect((await w.get(`/files?q=${"a".repeat(10_000)}`, A)).status).toBe(400);
    expect(Date.now() - t).toBeLessThan(2_000);
  });
  it("unknown sort, dir and filter names are 400", async () => {
    for (const p of ["sort=bogus", "sort=modified;DROP", "dir=sideways", "unknown=1", "sort=title,size"]) {
      expect((await w.get(`/files?${p}`, A)).status, p).toBe(400);
    }
  });
  it("repeated params and array syntax are rejected or deterministic, never 500", async () => {
    for (const p of ["q=a&q=b", "sort=size&sort=title", "limit=5&limit=500", "q[]=a", "q[x]=1", "mime=a&mime=b"]) {
      expect((await w.get(`/files?${p}`, A)).status, p).toBeLessThan(500);
    }
  });
  it("bad date ranges are 400 and inverted ranges are empty or 400", async () => {
    for (const p of ["from=notadate", "to=2026-13-45", "from=2026-01-01&to=2025-01-01"]) {
      expect([200, 400], p).toContain((await w.get(`/files?${p}`, A)).status);
    }
    expect((await w.get("/files?from=notadate", A)).status).toBe(400);
    const inv = await w.get("/files?from=2026-06-01&to=2025-01-01", A);
    if (inv.status === 200) expect(ids(inv.body)).toEqual([]);
  });
  it("huge headers and oversized URL do not crash the server", async () => {
    const r = await w.get(`/files?${"x=1&".repeat(5_000)}`, A).catch(() => ({ status: 414 }));
    expect(r.status).toBeLessThan(500);
    expect((await w.get("/files", A)).status).toBe(200);
  });
  it("non-GET methods are not served", async () => {
    for (const m of ["POST", "PUT", "DELETE", "PATCH"]) expect([404, 405], m).toContain((await w.get("/files", A, { method: m })).status);
  });
});
