import type { Page } from "@playwright/test";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launch, type Rig, type Scheme } from "./page.js";

let rig: Rig;
beforeAll(async () => {
  rig = await launch();
}, 120_000);
afterAll(async () => rig.stop(), 120_000);

const focus = (page: Page) =>
  page.evaluate(() => {
    const e = document.activeElement as HTMLElement;
    const s = getComputedStyle(e);
    const ring = (s.outlineStyle !== "none" && Number.parseFloat(s.outlineWidth) > 0) || s.boxShadow !== "none";
    return { tag: e.tagName.toLowerCase(), name: e.getAttribute("name") ?? "", href: e.getAttribute("href") ?? "", text: (e.textContent ?? "").trim(), ring };
  });
/** Tabs through the whole page, recording each stop, until focus leaves the document or `max` stops. */
const tabAll = async (page: Page, max = 80) => {
  const seen: Awaited<ReturnType<typeof focus>>[] = [];
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const f = await focus(page);
    if (f.tag === "body") break;
    seen.push(f);
  }
  return seen;
};
describe("keyboard use of the listing in Chromium", () => {
  for (const scheme of ["light", "dark"] as Scheme[])
    it(`${scheme}: Tab reaches skip link, search, filters, rows and next page, each with a visible focus`, async () => {
      const ctx = await rig.open(scheme);
      const page = await ctx.newPage();
      await page.goto(`${rig.env.base}/files?limit=5`);
      const stops = await tabAll(page);
      const at = (p: (s: (typeof stops)[number]) => boolean) => stops.findIndex(p);
      const [skip, search, filter, row, next] = [
        at((s) => s.href === "#main"),
        at((s) => s.name === "q"),
        at((s) => s.tag === "select"),
        at((s) => /^\/files\/[^?]+$/.test(s.href)),
        at((s) => /cursor=/.test(s.href)),
      ];
      expect(skip).toBe(0);
      for (const i of [search, filter, row, next]) expect(i, JSON.stringify(stops.map((s) => s.href || s.name || s.tag))).toBeGreaterThan(0);
      expect([skip, search, filter, row, next]).toEqual([...[skip, search, filter, row, next]].sort((a, b) => a - b));
      // A date input takes several Tab stops (segments, then the browser's own picker button); judge its first stop.
      const firsts = stops.filter((s, i) => s.href !== stops[i - 1]?.href || s.name !== stops[i - 1]?.name || s.tag !== stops[i - 1]?.tag);
      expect(firsts.filter((s) => !s.ring).map((s) => s.href || s.name)).toEqual([]);
      await ctx.close();
    });
  it("Enter on a row link opens that file, and Enter on Next page moves on", async () => {
    const ctx = await rig.open("light");
    const page = await ctx.newPage();
    await page.goto(`${rig.env.base}/files?limit=5`);
    const first = await page.locator("tbody a[href^='/files/']").first().getAttribute("href");
    await page.locator("tbody a[href^='/files/']").first().focus();
    await page.keyboard.press("Enter");
    await page.waitForURL(`**${first}`);
    expect(await page.locator("h1").textContent()).toBeTruthy();
    await page.goBack();
    await page.getByRole("link", { name: "Next page" }).focus();
    await page.keyboard.press("Enter");
    await page.waitForURL(/cursor=/);
    expect(await page.locator("tbody tr").count()).toBe(5);
    await ctx.close();
  });
}, 120_000);
