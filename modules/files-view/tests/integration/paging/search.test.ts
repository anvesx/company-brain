import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { boot, type Env } from "../support/app.js";
import { bulk, fid, members, seedWorld, visibleIdx } from "../support/world.js";

let env: Env;
const A = { tenant: "t1", user: "alice" };
beforeAll(async () => {
  env = await boot();
  await seedWorld(env.store);
  // a viewer who may read 1000 files but is allowed to see only 1 in 50 (the rest sit in a team zone she is not in)
  await bulk(env.pool, "s", "z", 1_000, (i) => ({
    title: `Z ${i}`,
    props: { owner: "o", zone: i % 50 === 0 ? "company" : "team", team: "secret", mime: "text/plain", size: "1", modified: "2026-01-01T00:00:00Z" },
  }));
}, 120_000);
afterAll(async () => env.stop(), 120_000);

const vis = visibleIdx("alice");
const got = async (qs: string) => [...(await env.walk(`/files?${qs}`, A)).ids].sort();
const want = (pred: (i: number) => boolean) => vis.filter(pred).map(fid);
describe("search, filter and sort", () => {
  it("title substring, case-insensitive", async () => expect(await got("q=doc%2001")).toEqual(want((i) => i >= 10 && i < 20)));
  it("source filter", async () => expect(await got("source=gdrive")).toEqual(want((i) => i % 4 === 0)));
  it("mime filter", async () => expect(await got("mime=application/pdf")).toEqual(want((i) => i % 2 === 0)));
  it("owner filter", async () => expect(await got("owner=bob")).toEqual(want((i) => i % 3 === 1)));
  it("cluster filter", async () => expect(await got("cluster=l3")).toEqual(want((i) => members(i).includes(3))));
  it("modified range filter", async () => {
    expect(await got("from=2026-10-01T02:00:00Z&to=2026-10-01T03:59:00Z")).toEqual(want((i) => i >= 120 && i <= 239));
  });
  it("filters combine with AND", async () => expect(await got("source=gdrive&owner=alice&q=Doc")).toEqual(want((i) => i % 4 === 0 && i % 3 === 0)));
  it("a search with no match renders the empty state, 200", async () => {
    const r = await env.call("/files?q=zzzz-nothing", A);
    expect(r.status).toBe(200);
    expect(r.body).toMatch(/No files match/);
  });
  const order = (sort: string, dir: "asc" | "desc") => async () => {
    const { ids } = await env.walk(`/files?sort=${sort}&dir=${dir}`, A);
    const key = (id: string): [number | string, string] => {
      const i = Number(id.slice(1));
      return [sort === "size" ? ((i * 37) % 1000) + 1 : sort === "title" ? `Doc ${String(i).padStart(3, "0")}` : i, id];
    };
    const exp = vis.map(fid).sort((a, b) => {
      const [x, y] = [key(a), key(b)];
      const c = x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : x[1] < y[1] ? -1 : 1;
      return dir === "asc" ? c : -c;
    });
    expect(ids).toEqual(exp);
  };
  for (const s of ["modified", "title", "size"]) for (const d of ["asc", "desc"] as const) it(`sort ${s} ${d}`, order(s, d));
  it("pages are not short while approved rows remain (1 in 50 visible)", async () => {
    const first = await env.call("/files?limit=10", { tenant: "s", user: "alice" });
    expect((first.body.match(/href="\/files\/z\d+"/g) ?? []).length).toBe(10);
    const { ids, pages } = await env.walk("/files", { tenant: "s", user: "alice" }, 10);
    expect(ids).toHaveLength(20);
    expect(new Set(ids).size).toBe(20);
    expect(pages).toBeLessThanOrEqual(3);
  });
  it("page size is capped at 100", async () => {
    const r = await env.call("/files?limit=100000", { tenant: "s", user: "alice" });
    expect(r.status).toBe(200);
    expect(r.body.match(/href="\/files\/z\d+"/g)?.length ?? 0).toBeLessThanOrEqual(100);
  });
  for (const qs of ["sort=bogus", "dir=sideways", "limit=abc", `q=${"x".repeat(5000)}`, "from=not-a-date"]) {
    it(`bad input ${qs.slice(0, 24)} is 400`, async () => expect((await env.call(`/files?${qs}`, A)).status).toBe(400));
  }
  it("injection strings are inert in search and filters", async () => {
    for (const qs of ["q=%27%3B%20DROP%20TABLE%20nodes%3B--", "source=%27%3B%20DROP%20TABLE%20nodes%3B--", "owner=%27%20OR%201%3D1--"]) {
      expect([200, 400]).toContain((await env.call(`/files?${qs}`, A)).status);
    }
    expect((await env.pool.query("SELECT count(*)::int n FROM nodes")).rows[0].n).toBeGreaterThan(1000);
  });
});
