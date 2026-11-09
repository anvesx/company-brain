import type { GraphStore } from "@anvesx/graph-store";
import type { Browser, Page } from "@playwright/test";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Env } from "../support/server.js";
import { cornerPixel } from "./pixel.js";
import { openGraph as open, RUN, startE2e } from "./support.js";

let env: Env;
let store: GraphStore;
let browser: Browser;
let stop: () => Promise<void>;
beforeAll(async () => {
  if (RUN) ({ env, store, browser, stop } = await startE2e());
}, 60_000);
afterAll(() => stop?.());

// The page script writes these on #graph: data-engine="stopped" from onEngineStop, and
// data-rendered-nodes from a scene() walk counting visible objects three-forcegraph tagged as nodes.
const rendered = async (page: Page) => Number(await page.locator("#graph").getAttribute("data-rendered-nodes"));

const openGraph = (page: Page) => open(env, store, page);

describe.skipIf(!RUN)("browser: the 3D graph page", () => {
  it("draws every node the JSON holds, then a legend toggle hides exactly one group", async () => {
    const page = await browser.newPage();
    const { json, ms } = await openGraph(page);
    console.log(`graph page: ${json.nodes.length} nodes, engine stopped after ${ms} ms`);
    expect(json.nodes).toHaveLength(4_323);
    expect(await rendered(page)).toBe(json.nodes.length);
    expect(await page.locator("script:not([src]):not([type=importmap])").count()).toBe(0);
    // Above 2,000 nodes dragging is off (rule 5); the page states what it set.
    expect(await page.locator("#graph").getAttribute("data-drag")).toBe("off");

    // Each swatch is painted through the style object (the CSP has no inline styles): a stale or blocked script leaves it transparent.
    const swatches = await page.locator(".swatch").evaluateAll((els) => els.map((el) => getComputedStyle(el).backgroundColor));
    expect(swatches).toHaveLength(json.categories.length);
    expect(swatches.filter((c) => c === "rgba(0, 0, 0, 0)")).toEqual([]);

    const notion = json.categories.find((c) => c.group === "document:notion");
    const toggle = page.getByRole("button", { name: new RegExp(`document:notion.*${notion?.count}`) });
    expect(await toggle.getAttribute("aria-pressed")).toBe("true");
    await toggle.click();
    expect(await toggle.getAttribute("aria-pressed")).toBe("false");
    // The page recounts at 150, 700, 2,000 and 4,000 ms after a toggle, so the poll waits longer than its 1 s default.
    await expect.poll(() => rendered(page), { timeout: 10_000 }).toBe(json.nodes.length - Number(notion?.count));
    await toggle.click();
    await expect.poll(() => rendered(page), { timeout: 10_000 }).toBe(json.nodes.length);
  }, 90_000);

  it("search selects a node and the side panel lists its neighbours", async () => {
    const page = await browser.newPage();
    await openGraph(page);
    await page.getByRole("searchbox").fill("Title of d0000");
    await page.locator("#graph[data-bloom]").waitFor({ state: "attached" }); // the controls are wired right after the bloom pass loads
    await page.getByRole("searchbox").fill("Title of d0000");
    await expect.poll(() => page.locator("#results li").count()).toBeGreaterThan(0); // typing lists matches
    await page.getByRole("searchbox").press("Enter");
    await expect.poll(() => page.locator("#results li").count()).toBe(0); // picking one closes the list, so it cannot cover the panel title
    await expect.poll(() => page.getByRole("region", { name: "Neighbours" }).textContent()).toContain("Title of p0");
  }, 90_000);

  it("the canvas stays black while the legend follows the colour scheme; checked both", async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const legendBg = () => page.getByRole("navigation", { name: "Categories" }).evaluate((el) => getComputedStyle(el).backgroundColor);
    await page.emulateMedia({ colorScheme: "light" });
    await openGraph(page);
    const light = await legendBg();
    await page.emulateMedia({ colorScheme: "dark" });
    const dark = await legendBg();
    expect(light).not.toBe(dark);
    // The bottom-right corner of the rendered canvas, read back from a real screenshot, is black in dark mode too.
    expect(await cornerPixel(browser, page)).toEqual([0, 0, 0]);
  }, 90_000);
});
