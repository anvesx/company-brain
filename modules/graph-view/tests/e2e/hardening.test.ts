import type { GraphStore } from "@anvesx/graph-store";
import type { Browser, Page } from "@playwright/test";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Env } from "../support/server.js";
import { whiteShare } from "./pixel.js";
import { openGraph, RUN, shot, startE2e } from "./support.js";

let env: Env;
let store: GraphStore;
let browser: Browser;
let stop: () => Promise<void>;
beforeAll(async () => {
  if (RUN) ({ env, store, browser, stop } = await startE2e());
}, 60_000);
afterAll(() => stop?.());

const box = (page: Page, selector: string) => page.locator(selector).evaluate((el) => ({ w: el.clientWidth, h: el.clientHeight }));

describe.skipIf(!RUN)("browser: the page under its Content-Security-Policy", () => {
  it("renders, blooms and logs no policy violation; the policy is enforced; the canvas fits #graph and follows resizes", async () => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const inline: string[] = []; // the script URL behind each "Applying inline style" refusal
    page.on("console", (m) => /Applying inline style/.test(m.text()) && inline.push(new URL(m.location().url).pathname));
    const { json, logs } = await openGraph(env, store, page);
    expect((await page.context().request.get(`${env.base}/graph`)).headers()["content-security-policy"]).toContain("script-src 'self'");
    // The only refusals are 3d-force-graph's own <style> injections (three of them, twice each); graph.css carries their rules.
    // Exactly six, all from the library: one from /graph.js would be our own code writing an inline style (a stale build does).
    expect(inline).toEqual(Array(6).fill("/3d-force-graph.js"));
    expect(logs.filter((l) => /content security policy|refused to/i.test(l) && !/Applying inline style/.test(l))).toEqual([]);
    await expect.poll(() => page.locator("#graph").getAttribute("data-bloom"), { timeout: 15_000 }).toBe("on");
    expect(Number(await page.locator("#graph").getAttribute("data-rendered-nodes"))).toBe(json.nodes.length);
    console.log(`three duplicates warned: ${logs.some((l) => l.includes("Multiple instances of Three.js"))}`);
    const blocked = await page.evaluate(
      () =>
        new Promise((done) => {
          document.addEventListener("securitypolicyviolation", (e) => done(e.violatedDirective));
          document.head.append(Object.assign(document.createElement("script"), { textContent: "1" }));
        }),
    );
    expect(blocked).toBe("script-src-elem");
    expect(await box(page, "#graph canvas")).toEqual(await box(page, "#graph"));
    expect((await box(page, "#graph")).h).toBe(752);
    await page.setViewportSize({ width: 1000, height: 700 });
    await expect.poll(() => box(page, "#graph canvas"), { timeout: 10_000 }).toEqual({ w: 1000, h: 652 });
  }, 90_000);

  it("a 401 from /v1/graph after the first page sends the person to /sign-in", async () => {
    const page = await browser.newPage();
    await page.route("**/v1/graph", (r) => r.continue(r.request().url().includes("?") ? {} : { url: `${r.request().url()}?limit=100` }));
    await openGraph(env, store, page);
    await page.context().clearCookies();
    await page.getByRole("button", { name: "Load more" }).click();
    await page.waitForURL(/\/sign-in/);
  }, 90_000);

  it("zoomed out and zoomed in, light and dark, the group colours survive the bloom", async () => {
    for (const scheme of ["light", "dark"] as const) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, colorScheme: scheme });
      await openGraph(env, store, page);
      await page.waitForTimeout(800);
      await shot(page, `graph-out-${scheme}`);
      const share = await whiteShare(browser, page);
      console.log(`${scheme}: near-white share of lit pixels ${share.toFixed(3)}`);
      expect(share).toBeLessThan(0.25);
      await page.getByRole("searchbox").fill("Title of d0000");
      await page.getByRole("searchbox").press("Enter");
      await page.waitForTimeout(1600);
      await shot(page, `graph-in-${scheme}`);
    }
  }, 120_000);
});
