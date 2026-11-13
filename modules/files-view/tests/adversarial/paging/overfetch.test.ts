import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { A, B, boot, ids, type World } from "../support/world.js";

let w: World;
const props = { owner: "bob", zone: "company", mime: "a", size: "1", modified: "2026-01-01T00:00:00Z" };
beforeAll(async () => {
  w = await boot();
  await w.bulk(2000, (i) => ({ title: `N${String(i).padStart(4, "0")}`, props }), { readers: ["bob"] });
  await w.pool.query(
    `INSERT INTO edges (tenant,from_id,to_id,kind,source,valid_from) SELECT 't1','alice','b'||g,'can-read','drive',1 FROM generate_series(0,1999,50) g`,
  );
});
afterAll(() => w.close());

describe("gate-aware paging", () => {
  it("a viewer who sees 1 in 50 rows still gets full pages while rows remain", async () => {
    const r = await w.get("/files?limit=20&sort=title&dir=asc", A);
    expect(r.status).toBe(200);
    expect(ids(r.body).length).toBe(20);
  });
  it("a page of 100 approved rows is complete (the gate rechecks a whole page)", async () => {
    const r = await w.get("/files?limit=100&sort=title&dir=asc", B);
    expect(ids(r.body).length).toBe(100);
  });
  it("a viewer who sees nothing in 2000 rows gets an empty 200 quickly, not a hang or 500", async () => {
    const t = Date.now();
    const r = await w.get("/files?limit=100", { tenant: "t1", user: "nobody" });
    expect([r.status, ids(r.body)]).toEqual([200, []]);
    expect(Date.now() - t).toBeLessThan(10_000);
  });
  it("walking a sparse viewer's pages yields exactly their approved set, no dupes", async () => {
    const seen: string[] = [];
    let url = "/files?limit=7&sort=title&dir=asc";
    for (let n = 0; n < 100; n++) {
      const r = await w.get(url, A);
      seen.push(...ids(r.body));
      const nx = /href="([^"]*cursor=[^"]+)"/.exec(r.body)?.[1];
      if (!nx) break;
      url = nx.replaceAll("&amp;", "&");
    }
    expect(new Set(seen).size).toBe(seen.length);
    expect(seen).toHaveLength(40);
  });
  it("cluster counts are exact for small sets and at least the cap for huge ones, never inflated by hidden files", async () => {
    await w.cluster("big", { why: "Same folder /big" });
    await w.pool.query(
      "INSERT INTO edges (tenant,from_id,to_id,kind,source,valid_from) SELECT 't1','b'||g,'big','belongs-to','brain',1 FROM generate_series(0,1999) g",
    );
    const bob = (await w.get("/clusters/big", B)).body;
    expect(bob).toMatch(/500|2,?000/);
    expect(bob.replace(/<style>.*?<\/style>/gs, "")).not.toMatch(/\b[1-9]\d{4,}\b/);
    expect((await w.get("/clusters/big", A)).body).toMatch(/\b40\b/);
  });
});
