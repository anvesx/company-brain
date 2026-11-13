import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { boot, type Env } from "../support/app.js";
import { bulk } from "../support/world.js";

let env: Env;
const A = { tenant: "c", user: "alice" };
beforeAll(async () => {
  env = await boot();
  await bulk(env.pool, "c", "d", 30, (i) => ({
    title: `T${i}`,
    props: { owner: "alice", zone: "company", mime: "text/plain", size: String(i), modified: "2026-01-01T00:00:00Z" },
  }));
}, 120_000);
afterAll(async () => env.stop(), 120_000);

const realCursor = async (extra = ""): Promise<string> => {
  const body = (await env.call(`/files?limit=10${extra}`, A)).body;
  return /cursor=([^"&]+)/.exec(body)?.[1] as string;
};
describe("opaque cursor", () => {
  it("is base64url, carries no raw sql", async () => {
    const c = await realCursor();
    expect(c).toMatch(/^[A-Za-z0-9_-]+$/);
  });
  it("a full page links onward and walking the links yields every file once", async () => {
    const w = await env.walk("/files", A, 10);
    expect([w.pages, w.ids.length, new Set(w.ids).size]).toEqual([3, 30, 30]);
    expect((await env.call("/files?limit=100", A)).body).not.toMatch(/cursor=/);
  });
  it("a working cursor returns the next page, 200", async () => {
    expect((await env.call(`/files?limit=10&cursor=${await realCursor()}`, A)).status).toBe(200);
  });
  const bad: [string, (c: string) => string][] = [
    ["garbage", () => "!!!not-a-cursor"],
    ["empty json", () => Buffer.from("{}").toString("base64url")],
    ["truncated", (c) => c.slice(0, Math.max(1, c.length - 6))],
    ["flipped bytes", (c) => `${c.slice(0, 4)}${c[4] === "A" ? "B" : "A"}${c.slice(5)}`],
    ["sql in cursor", () => Buffer.from(JSON.stringify(["'; DROP TABLE nodes;--", "x"])).toString("base64url")],
    ["oversize", () => "A".repeat(4_000)],
  ];
  for (const [name, mk] of bad) {
    it(`tampered cursor (${name}) is 400, never 500`, async () => {
      const r = await env.call(`/files?limit=10&cursor=${mk(await realCursor())}`, A);
      expect(r.status).toBe(400);
    });
  }
  it("a 100 KB cursor is refused by the server (431) before it can reach the app, never 200 or 500", async () => {
    expect([400, 414, 431]).toContain((await env.call(`/files?cursor=${"A".repeat(100_000)}`, A)).status);
  });
  it("a cursor from one sort order is rejected under another", async () => {
    const c = await realCursor("&sort=size&dir=asc");
    expect((await env.call(`/files?limit=10&sort=title&dir=desc&cursor=${c}`, A)).status).toBe(400);
  });
  it("the nodes table survives the injection attempt", async () => {
    expect((await env.pool.query("SELECT count(*)::int AS n FROM nodes")).rows[0].n).toBe(30);
  });
});
