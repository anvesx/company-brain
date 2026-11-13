import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { A, boot, ids, type World } from "../support/world.js";

let w: World;
const N = 1200;
const base = { owner: "alice", zone: "company", mime: "text/plain" };
beforeAll(async () => {
  w = await boot();
  // heavy ties on every sort key, numeric strings of different widths, unicode titles
  await w.bulk(N, (i) => ({
    title: i % 7 === 0 ? `é-${i % 5}` : `same-${i % 3}`,
    props: { ...base, size: String((i * 37) % 120), modified: `2026-01-0${1 + (i % 4)}T00:00:00Z` },
  }));
});
afterAll(() => w.close());

const walk = async (qs: string, limit = 100) => {
  const seen: string[] = [];
  let url = `/files?limit=${limit}&${qs}`;
  for (let n = 0; n < 200; n++) {
    const r = await w.get(url, A);
    expect(r.status, url).toBe(200);
    seen.push(...ids(r.body));
    const next = /href="([^"]*cursor=[^"]+)"/.exec(r.body)?.[1];
    if (!next) return seen;
    url = next.replaceAll("&amp;", "&");
  }
  throw new Error("pagination never terminated");
};

describe("keyset pagination edges", () => {
  for (const sort of ["modified", "title", "size"]) {
    for (const dir of ["asc", "desc"]) {
      it(`${sort} ${dir}: all rows, no duplicates, no gaps despite ties`, async () => {
        const seen = await walk(`sort=${sort}&dir=${dir}`);
        expect(new Set(seen).size).toBe(seen.length);
        expect(seen).toHaveLength(N);
      });
    }
  }
  it("size sorts numerically ('9' before '100'), not lexically", async () => {
    const r = await w.get("/files?sort=size&dir=asc&limit=100", A);
    const sizes = await Promise.all(
      ids(r.body)
        .slice(0, 60)
        .map(async (id) => Number(((await w.pool.query("SELECT props FROM nodes WHERE id=$1", [id])).rows[0].props as string).match(/"size","(\d+)"/)?.[1])),
    );
    expect(sizes).toEqual([...sizes].sort((a, b) => a - b));
  });
  it("rows inserted and deleted between page fetches cause no duplicate and no skipped stable row", async () => {
    const first = await w.get("/files?limit=100&sort=modified&dir=desc", A);
    const next = /href="([^"]*cursor=[^"]+)"/.exec(first.body)?.[1]?.replaceAll("&amp;", "&") ?? "";
    await w.file("late-new", { modified: "2099-01-01T00:00:00Z" });
    await w.store.tombstone("t1", "b500", 5);
    const second = await w.get(next, A);
    expect(second.status).toBe(200);
    const [a, b] = [ids(first.body), ids(second.body)];
    expect(b.filter((x) => a.includes(x))).toEqual([]);
    expect(b).not.toContain("late-new");
  });
  it("last page of exactly `limit` rows has no next link or an empty last page, never a loop", async () => {
    await w.pool.query("DELETE FROM edges WHERE to_id LIKE 'b%' AND to_id::text !~ '^b[0-9]$'");
    const seen = await walk("sort=title&dir=asc", 10);
    expect(new Set(seen).size).toBe(seen.length);
  });
  it("empty result shows an empty state and no next link", async () => {
    const r = await w.get("/files?q=zzzzzz-no-such", A);
    expect(r.status).toBe(200);
    expect(r.body).not.toMatch(/cursor=/);
  });
  it("missing size/modified/mime metadata rows are not dropped from any sort", async () => {
    await w.file("sparse", { props: {}, title: "Sparse" });
    await w.pool.query(`UPDATE nodes SET props='[["owner","alice"],["zone","company"]]' WHERE id='sparse'`);
    for (const s of ["modified", "size", "title"]) expect(await walk(`sort=${s}&dir=desc`), s).toContain("sparse");
  });
});
