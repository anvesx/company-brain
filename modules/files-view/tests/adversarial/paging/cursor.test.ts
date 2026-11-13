import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { A, B, boot, type World } from "../support/world.js";

let w: World;
const b64 = (o: unknown) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");
beforeAll(async () => {
  w = await boot();
  await w.bulk(150, (i) => ({ title: `T${i}`, props: { owner: "alice", zone: "company", mime: "a", size: String(i), modified: "2026-01-01T00:00:00Z" } }));
  await w.file("tx", { tenant: "t2", title: "T2-SECRET", readers: ["xena"], owner: "xena" });
});
afterAll(() => w.close());
const cur = async (qs = "") => /cursor=([^"&]+)/.exec((await w.get(`/files?limit=100${qs}`, A)).body)?.[1] ?? "";

describe("cursor tampering and replay", () => {
  it("garbage, truncated, wrong-typed and injected cursors are 400, never 500", async () => {
    const good = await cur();
    expect(good).not.toBe("");
    const bad = [
      "x",
      "!!!",
      good.slice(0, 5),
      `${good}AAAA`,
      b64("[]"),
      b64("null"),
      b64({}),
      b64({ k: [1], id: 5 }),
      b64("{not json"),
      b64({ id: "'; DROP TABLE nodes;--", k: ["a"] }),
      "A".repeat(100_000),
      "%00",
    ];
    for (const c of bad) {
      const s = (await w.get(`/files?cursor=${encodeURIComponent(c)}`, A)).status;
      expect([400, 431], c.slice(0, 20)).toContain(s);
    }
    expect((await w.pool.query("SELECT 1 FROM nodes LIMIT 1")).rowCount).toBe(1);
  });
  it("a cursor pointing at another tenant's row id cannot reveal or skip into tenant data", async () => {
    const forged = b64({ k: ["2026-01-01T00:00:00Z"], id: "tx" });
    const r = await w.get(`/files?cursor=${forged}`, A);
    expect([200, 400]).toContain(r.status);
    expect(r.body).not.toContain("T2-SECRET");
  });
  it("a cursor from one sort or filter is rejected under another (no silent wrong page)", async () => {
    const c = await cur("&sort=size");
    const r = await w.get(`/files?limit=100&sort=title&cursor=${c}`, A);
    expect(r.status).toBe(400);
  });
  it("cursor is opaque base64url and carries no tenant, viewer or title text", async () => {
    const c = await cur();
    expect(c).toMatch(/^[A-Za-z0-9_-]+$/);
    const raw = Buffer.from(c, "base64url").toString("utf8");
    expect(raw).not.toMatch(/t1|alice/);
  });
  it("same query twice yields the identical next cursor (deterministic)", async () => {
    expect(await cur()).toBe(await cur());
  });
  it("concurrent walks by two viewers never mix results", async () => {
    await w.file("bob-only", { readers: ["bob"], title: "BOB-ONLY" });
    const hit = await Promise.all(Array.from({ length: 40 }, (_, i) => w.get("/files?limit=100", i % 2 ? B : A)));
    expect(hit.filter((_, i) => i % 2 === 0).some((r) => r.body.includes("BOB-ONLY"))).toBe(false);
  });
});
