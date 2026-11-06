import type { Browser } from "@playwright/test";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { INSTALL_CLIENTS, renderInstall } from "../../src/index.js";
import { MCP_URL, RUN, scripts, shot, signUpThroughPage, startE2e } from "./support.js";

let browser: Browser;
let stop: () => Promise<void>;
beforeAll(async () => {
  if (RUN) ({ browser, stop } = await startE2e());
});
afterAll(() => stop?.());

const manifest = { name: "company-brain", url: MCP_URL };

describe.skipIf(!RUN)("browser: install guide", () => {
  it("rule 10: the guide shows every client's rendered file and the Claude Code command", async () => {
    const page = await browser.newPage();
    await signUpThroughPage(page);
    const guide = page.getByRole("region", { name: /install/i });
    const text = String(await guide.textContent());
    for (const client of INSTALL_CLIENTS) {
      const out = renderInstall(manifest, client);
      expect(text, client).toContain(out.path);
      expect(text.replace(/\s+/g, " "), client).toContain(out.body.trim().replace(/\s+/g, " "));
    }
    expect(text).toContain(String(renderInstall(manifest, "claude-code").command));
    expect(text).toContain("check current docs");
    await shot(page, "guide");
  });

  it("rule 12: the copy button writes the clipboard and is the page's only script", async () => {
    const context = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
    const page = await context.newPage();
    await signUpThroughPage(page);
    expect(await scripts(page)).toBeLessThanOrEqual(1);
    await page.getByRole("button", { name: /copy/i }).first().click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain(MCP_URL);
    await context.close();
  });
});
