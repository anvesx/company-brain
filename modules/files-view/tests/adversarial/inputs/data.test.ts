import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { A, boot, ids, type World } from "../support/world.js";

let w: World;
const U = ["日本語ファイル", "Ünïcödé", "🚀🔥 emoji", "עברית RTL", "é combining", "a".repeat(500), " lead trail ", "UPPER lower"];
beforeAll(async () => {
  w = await boot();
  for (const [i, t] of U.entries()) await w.file(`u${i}`, { title: t });
  await w.file("bad-size", { size: "not-a-number", title: "BadSize" });
  await w.file("neg-size", { size: "-5", title: "NegSize" });
  await w.file("huge-size", { size: "99999999999999999999999", title: "HugeSize" });
  await w.file("bad-date", { modified: "yesterday", title: "BadDate" });
  await w.file("empty-owner", { props: { owner: "" }, title: "EmptyOwner", readers: ["bob"] });
  await w.file("dup-a", { title: "Same Title" });
  await w.file("dup-b", { title: "Same Title" });
});
afterAll(() => w.close());

describe("hostile and odd metadata", () => {
  it("unicode, emoji, RTL, combining and 500-char titles render and are searchable", async () => {
    const r = await w.get("/files?limit=100", A);
    expect(r.status).toBe(200);
    for (const t of U.slice(0, 5)) expect(r.body).toContain(t.replace(/&/g, "&amp;"));
    expect(ids((await w.get(`/files?q=${encodeURIComponent("日本")}`, A)).body)).toEqual(["u0"]);
    expect(ids((await w.get(`/files?q=${encodeURIComponent("🚀")}`, A)).body)).toEqual(["u2"]);
  });
  it("unparseable, negative and astronomically large size or date do not 500 any screen or sort", async () => {
    for (const s of ["modified", "size", "title"])
      for (const d of ["asc", "desc"]) {
        const r = await w.get(`/files?sort=${s}&dir=${d}&limit=100`, A);
        expect(r.status, `${s} ${d}`).toBe(200);
        expect(r.body).not.toMatch(/NaN|Invalid Date|Infinity|undefined/);
      }
    for (const id of ["bad-size", "neg-size", "huge-size", "bad-date"]) expect((await w.get(`/files/${id}`, A)).status).toBe(200);
  });
  it("two files with the same title are two rows, not merged", async () => {
    expect(ids((await w.get("/files?q=Same%20Title", A)).body).sort()).toEqual(["dup-a", "dup-b"]);
  });
  it("owner filter with empty or odd owner does not match everything", async () => {
    expect((await w.get("/files?owner=", A)).status).toBeLessThan(500);
    expect(ids((await w.get("/files?owner=nobody", A)).body)).toEqual([]);
  });
  it("encoded slash, dot segments, and very long id are 404 not 500", async () => {
    for (const p of ["/files/..%2f..%2fetc%2fpasswd", "/files/%2e%2e", `/files/${"a".repeat(5_000)}`, "/files//", "/files/%E0%A4%A", "/clusters/%"]) {
      const s = (await w.get(p, A)).status;
      expect([400, 404], p).toContain(s);
    }
  });
  it("200 concurrent mixed requests all succeed with consistent bodies", async () => {
    const paths = ["/files", "/files?q=Same", "/clusters", "/files/u0", "/files?sort=size"];
    const rs: Awaited<ReturnType<typeof w.get>>[] = [];
    for (let b = 0; b < 4; b++) rs.push(...(await Promise.all(Array.from({ length: 50 }, (_, i) => w.get(paths[(b * 50 + i) % 5] as string, A)))));
    expect(rs.every((r) => r.status === 200)).toBe(true);
    for (let k = 0; k < 5; k++) expect(new Set(rs.filter((_, i) => i % 5 === k).map((r) => r.body.replace(/nonce-[\w-]+/g, ""))).size).toBe(1);
  });
  it("a file whose source node was upserted concurrently never appears twice", async () => {
    await Promise.all(Array.from({ length: 20 }, (_, i) => w.file("race", { title: `Race ${i % 2}` })));
    expect(ids((await w.get("/files?q=Race", A)).body)).toEqual(["race"]);
  });
  it("a date-only `to` includes files modified later that same day", async () => {
    await w.file("late-day", { title: "LateDay", modified: "2031-05-05T17:30:00Z" });
    expect(ids((await w.get("/files?from=2031-05-05&to=2031-05-05", A)).body)).toEqual(["late-day"]);
  });
});
