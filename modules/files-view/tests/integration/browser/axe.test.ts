import AxeBuilder from "@axe-core/playwright";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { launch, type Rig, type Scheme, SHOTS } from "./page.js";

let rig: Rig;
beforeAll(async () => {
  rig = await launch();
}, 120_000);
afterAll(async () => rig.stop(), 120_000);

const PAGES = ["/files?limit=20", "/files/f030", "/clusters", "/clusters/l0", "/files?q=zzzz-none", "/files/nope"];
describe("axe-core in Chromium, colour contrast included, zero violations", () => {
  for (const scheme of ["light", "dark"] as Scheme[])
    for (const path of PAGES)
      it(`${scheme} ${path}`, async () => {
        const ctx = await rig.open(scheme);
        const page = await ctx.newPage();
        await page.goto(rig.env.base + path);
        expect(await page.evaluate(() => matchMedia("(prefers-color-scheme: dark)").matches)).toBe(scheme === "dark");
        const r = await new AxeBuilder({ page }).analyze();
        expect(r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes[0]?.target}`)).toEqual([]);
        await ctx.close();
      });
  it("the 401 page for a missing token also has zero violations", async () => {
    const ctx = await rig.open("light", false);
    const page = await ctx.newPage();
    expect((await page.goto(`${rig.env.base}/files`))?.status()).toBe(401);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await ctx.close();
  });
  it("saves a screenshot per scheme and width (1280, 375) for the listing, a file and the groups", async () => {
    for (const width of [1280, 375])
      for (const scheme of ["light", "dark"] as Scheme[]) {
        const ctx = await rig.open(scheme, true, width);
        for (const [path, name] of [
          ["/files?limit=20", "files"],
          ["/files/f030", "file"],
          ["/clusters", "clusters"],
        ] as const)
          await rig.shot(ctx, path, `${name}-${scheme}-${width}.png`);
        const page = await ctx.newPage();
        await page.goto(`${rig.env.base}/files?limit=20`);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
        await ctx.close();
      }
    console.log(`screenshots: ${SHOTS}`);
  });
}, 120_000);
