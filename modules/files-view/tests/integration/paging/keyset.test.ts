import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { boot, type Env, ids } from "../support/app.js";
import { bulk } from "../support/world.js";

let env: Env;
const N = 5_000;
const A = { tenant: "k", user: "alice" };
const props = (i: number) => ({
  owner: "alice",
  zone: "company",
  mime: "text/plain",
  size: String((i * 37) % 120),
  modified: `2026-01-0${1 + (i % 4)}T00:00:0${i % 6}Z`,
});
beforeAll(async () => {
  env = await boot();
  await bulk(env.pool, "k", "b", N, (i) => ({ title: `t-${i % 9}`, props: props(i) }));
}, 120_000);
afterAll(async () => env.stop(), 120_000);

const all = Array.from({ length: N }, (_, i) => `b${i}`).sort();
// A full 50-page walk per sort order is slow on a loaded machine; the assertions below are unchanged.
describe("keyset paging over 5,000 rows", () => {
  for (const sort of ["modified", "title", "size"]) {
    for (const dir of ["asc", "desc"]) {
      it(`${sort} ${dir}: union of pages is the full set, no duplicates, no gaps`, async () => {
        const { ids: got, pages } = await env.walk(`/files?sort=${sort}&dir=${dir}`, A);
        expect(got).toHaveLength(N);
        expect(new Set(got).size).toBe(N);
        expect([...got].sort()).toEqual(all);
        expect(pages).toBeGreaterThanOrEqual(50);
      }, 120_000);
    }
  }
  it("is stable when rows are inserted between fetches", async () => {
    const seen: string[] = [];
    let r = await env.call("/files?sort=title&dir=asc&limit=100", A);
    seen.push(...ids(r.body));
    await bulk(env.pool, "k", "early", 50, () => ({ title: "AAA-early", props: props(1) }));
    await bulk(env.pool, "k", "late", 50, () => ({ title: "zzz-late", props: props(2) }));
    for (let url = /href="([^"]*cursor=[^"]+)"/.exec(r.body)?.[1]; url; ) {
      r = await env.call(url.replaceAll("&amp;", "&"), A);
      seen.push(...ids(r.body));
      url = /href="([^"]*cursor=[^"]+)"/.exec(r.body)?.[1];
    }
    expect(new Set(seen).size).toBe(seen.length);
    expect(all.every((id) => seen.includes(id))).toBe(true);
    expect(seen.filter((id) => id.startsWith("late"))).toHaveLength(50);
    expect(seen.some((id) => id.startsWith("early"))).toBe(false);
  }, 120_000);
});
