import type { Browser } from "@playwright/test";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { renderInstall } from "../../src/index.js";
import { BASE, MCP_URL, PASSWORD, RUN, scripts, shot, signUpThroughPage, startE2e } from "./support.js";

let browser: Browser;
let stop: () => Promise<void>;
beforeAll(async () => {
  if (RUN) ({ browser, stop } = await startE2e());
});
afterAll(() => stop?.());

describe.skipIf(!RUN)("browser: account and organizations", () => {
  it("rule 9: sign-up lands on the connections page; zero connections shows the catalog first", async () => {
    const page = await browser.newPage();
    await page.goto(`${BASE}/sign-up`);
    await shot(page, "sign-up");
    await signUpThroughPage(page);
    expect(new URL(page.url()).pathname).toBe("/connections");
    const catalog = page.getByRole("region", { name: /catalog/i });
    const install = page.getByRole("region", { name: /install/i });
    expect(await catalog.isVisible()).toBe(true);
    const [c, i] = [await catalog.boundingBox(), await install.boundingBox()];
    expect(Number(c?.y)).toBeLessThan(Number(i?.y));
    await shot(page, "connections");
    expect(await page.locator("pre").first().textContent()).toContain(
      JSON.parse(renderInstall({ name: "company-brain", url: MCP_URL }, "claude-code").body).mcpServers["company-brain"].url,
    );
  });

  it("rule 12: the sign-in page ships no script; sign-out then sign-in works", async () => {
    const page = await browser.newPage();
    const email = await signUpThroughPage(page);
    await page.getByRole("button", { name: /sign out/i }).click();
    await page.waitForURL(/\/sign-in/);
    expect(await scripts(page)).toBe(0);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/connections/);
  });

  it("rule 3: the picker switches the active organization and carries a CSRF token", async () => {
    const page = await browser.newPage();
    await signUpThroughPage(page);
    const created = await page.request.post(`${BASE}/api/auth/organization/create`, {
      data: { name: "Acme", slug: `acme-${Date.now()}` },
      headers: { origin: BASE },
    });
    expect(created.ok()).toBe(true);
    await page.goto(`${BASE}/picker`);
    expect(await page.locator('input[type="hidden"][name="csrf"]').count()).toBeGreaterThan(0);
    await shot(page, "picker");
    await page.getByRole("button", { name: /acme/i }).click();
    await page.waitForURL(/\/connections/);
    expect(await page.getByText("Acme").first().isVisible()).toBe(true);
  });

  it("rule 11: the Account link opens the account page, which lists no apps for a new user", async () => {
    const page = await browser.newPage();
    await signUpThroughPage(page);
    await page.getByRole("link", { name: /account/i }).click();
    await page.waitForURL(/\/account/);
    expect(await page.getByText("No apps yet.").isVisible()).toBe(true);
  });
});
