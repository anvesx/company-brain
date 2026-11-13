import axe from "axe-core";
import { JSDOM } from "jsdom";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { boot, dom, type Env } from "../support/app.js";
import { bulk, seedWorld } from "../support/world.js";

let env: Env;
const A = { tenant: "t1", user: "alice" };
beforeAll(async () => {
  env = await boot();
  await seedWorld(env.store);
  await bulk(env.pool, "e", "e", 5, (i) => ({
    title: `E ${i}`,
    props: { owner: "alice", zone: "company", mime: "text/plain", size: "1", modified: "2026-01-01T00:00:00Z" },
  }));
}, 120_000);
afterAll(async () => env.stop(), 120_000);

// jsdom has no layout, so colour contrast is covered by colors.test.ts and by Chromium in tools/e2e.
const violations = async (html: string) => {
  const win = new JSDOM(html, { runScripts: "outside-only" }).window;
  win.eval(axe.source);
  const r = await (win as unknown as { axe: typeof axe }).axe.run(win.document.documentElement, { rules: { "color-contrast": { enabled: false } } });
  return r.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 80)}`);
};
describe("axe-core finds zero violations on the served pages", () => {
  const pages: [string, { tenant: string; user: string }][] = [
    ["/files?limit=20", A],
    ["/files/f030", A],
    ["/clusters", A],
    ["/clusters/l0", A],
    ["/files", { tenant: "nobody", user: "x" }],
    ["/files?q=zzzz-none", A],
  ];
  for (const [p, who] of pages) it(`${p} has no violations`, async () => expect(await violations((await env.call(p, who)).body)).toEqual([]));
  it("the 404 and 401 pages have no violations", async () => {
    expect(await violations((await env.call("/files/nope", A)).body)).toEqual([]);
    expect(await violations((await env.call("/files")).body)).toEqual([]);
  });
  it("has a skip link, a main landmark, a labelled search field and a document language", async () => {
    const d = dom((await env.call("/files", A)).body);
    expect(d.documentElement.lang).toBe("en");
    expect(d.querySelector('a[href^="#"]')).not.toBeNull();
    expect(d.querySelector("main")).not.toBeNull();
    expect(d.querySelector('input[name="q"]')?.id).toBeTruthy();
    expect(d.querySelector(`label[for="${d.querySelector('input[name="q"]')?.id}"]`)).not.toBeNull();
  });
});
