import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { boot, dom, type Env } from "../support/app.js";
import { fid, members, pathOf, seedWorld, visibleIdx } from "../support/world.js";

let env: Env;
beforeAll(async () => {
  env = await boot();
  await seedWorld(env.store);
}, 120_000);
afterAll(async () => env.stop(), 120_000);

const who = (user: string) => ({ tenant: "t1", user });
const rowOf = (html: string, id: string) => dom(html).querySelector(`a[href="/files/${id}"]`)?.closest("tr") as HTMLTableRowElement;

describe("listing returns exactly the gate-approved files", () => {
  for (const user of ["alice", "bob", "carol"] as const) {
    it(`${user} sees the exact id set, no duplicates`, async () => {
      const { ids } = await env.walk("/files", who(user));
      expect(ids.length).toBe(new Set(ids).size);
      expect([...ids].sort()).toEqual(visibleIdx(user).map(fid));
    });
  }
  it("the three viewers see three different sets", () => {
    expect(new Set([visibleIdx("alice").length, visibleIdx("bob").length, visibleIdx("carol").length]).size).toBe(3);
  });
  it("each row has up to 3 cluster paths, root to leaf, with each leaf's why", async () => {
    const r = await env.call("/files?limit=100&sort=title&dir=asc", who("alice"));
    const first = dom(r.body).querySelectorAll("tbody tr");
    expect(first.length).toBe(100);
    for (const tr of first) {
      const id = (tr.querySelector('a[href^="/files/"]') as HTMLAnchorElement).getAttribute("href")?.slice(7) as string;
      const want = members(Number(id.slice(1))).map(pathOf);
      const leaves = want.map((p) => p[2] as string).filter((n) => tr.textContent?.includes(n));
      expect(leaves.length, id).toBe(Math.min(3, want.length));
      for (const l of leaves) {
        const n = l.slice(6);
        expect(tr.outerHTML, `${id} root>mid>leaf`).toContain(`Why l${n}`);
        expect(tr.textContent).toContain(pathOf(Number(n)).slice(0, 2)[0]);
        expect(tr.textContent).toContain(pathOf(Number(n))[1]);
      }
    }
  });
  it("every row carries title, source, owner, modified and size, and never the address", async () => {
    const r = await env.call("/files?q=Doc%20003", who("bob"));
    const text = rowOf(r.body, "f003").textContent as string;
    for (const part of ["Doc 003", "slack", "alice", "2026-10-01", "112 B"]) expect(text).toContain(part);
    expect(r.body).not.toMatch(/src\.example|v1\b.*address/);
  });
  it("no row or why text from the other tenants leaks", async () => {
    const p = await env.walk("/files", who("alice"));
    expect(p.ids.some((i) => /^[gh]/.test(i))).toBe(false);
    const html = (await env.call("/files?limit=100", who("alice"))).body + (await env.call("/clusters/l0", who("alice"))).body;
    expect(html).not.toMatch(/OTHER TENANT/);
  });
  it("a viewer of tenant t2 sees only t2 files", async () => {
    const { ids } = await env.walk("/files", { tenant: "t2", user: "alice" });
    expect(ids).toHaveLength(100);
    expect(ids.every((i) => i.startsWith("g"))).toBe(true);
  });
});
