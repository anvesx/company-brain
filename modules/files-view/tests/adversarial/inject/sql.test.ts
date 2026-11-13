import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { A, boot, ids, type World } from "../support/world.js";

let w: World;
beforeAll(async () => {
  w = await boot();
  for (const t of ["100%", "a_b", "axb", "back\\slash", "plain", "O'Brien"])
    await w.file(`f-${["100%", "a_b", "axb", "back\\slash", "plain", "O'Brien"].indexOf(t)}`, { title: t });
  await w.cluster("c1");
});
afterAll(() => w.close());
const DROP = "'; DROP TABLE nodes;--";
const q = (k: string, v: string) => `/files?${k}=${encodeURIComponent(v)}`;
const alive = async () => expect((await w.pool.query("SELECT count(*)::int AS n FROM nodes")).rows[0].n).toBeGreaterThan(5);

describe("sql injection and LIKE wildcards", () => {
  it("survives DROP TABLE in every parameter, path and cursor with no 500", async () => {
    const urls = ["q", "source", "mime", "owner", "cluster", "from", "to", "sort", "dir", "cursor", "limit"].map((k) => q(k, DROP));
    urls.push(`/files/${encodeURIComponent(DROP)}`, `/clusters/${encodeURIComponent(DROP)}`, q("q", "' OR 1=1 --"), q("q", "\\"), q("q", '"'));
    for (const u of urls) expect((await w.get(u, A)).status, u).toBeLessThan(500);
    await alive();
  });
  it("search treats % and _ and backslash literally", async () => {
    expect((await w.get(q("q", "%"), A)).status).toBeLessThan(500);
    expect(ids((await w.get(q("q", "%"), A)).body)).toHaveLength(1); // only "100%"
    expect(ids((await w.get(q("q", "a_b"), A)).body)).toHaveLength(1); // not "axb"
    expect(ids((await w.get(q("q", "\\"), A)).body)).toHaveLength(1); // only back\slash
  });
  it("apostrophes in titles and searches work", async () => {
    expect(ids((await w.get(q("q", "O'Brien"), A)).body)).toHaveLength(1);
  });
  it("search is case-insensitive substring, like nodes_title_trgm serves", async () => {
    expect(ids((await w.get(q("q", "PLAIN"), A)).body)).toHaveLength(1);
    expect(ids((await w.get(q("q", "lai"), A)).body)).toHaveLength(1);
  });
  it("NUL byte and lone surrogate in q are 400, never 500", async () => {
    for (const v of ["a%00b", "%ED%A0%80", "%FF%FE"]) {
      const s = (await w.get(`/files?q=${v}`, A)).status;
      expect([200, 400], v).toContain(s);
    }
    expect((await w.get("/files?q=a%00b", A)).status).toBe(400);
  });
  it("NUL byte in path id and filter values is 400 or 404, never 500", async () => {
    for (const p of ["/files/a%00b", "/clusters/a%00b", "/files?source=a%00b", "/files?owner=a%00b", "/files?cluster=a%00b"]) {
      expect([400, 404], p).toContain((await w.get(p, A)).status);
    }
  });
});
