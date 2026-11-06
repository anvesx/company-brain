import { randomUUID } from "node:crypto";
import { type Browser, chromium, type Page } from "@playwright/test";
import { startServer } from "./server.js";

export const RUN = process.env["PLAYWRIGHT"] === "1";
export const BASE = process.env["E2E_BASE_URL"] ?? "http://localhost:18788";
export const MCP_URL = process.env["E2E_MCP_URL"] ?? "https://brain.example.com/mcp";
export const PASSWORD = "violet-anchor-quartz-1987";

export const launch = (): Promise<Browser> => {
  const executablePath = process.env["E2E_CHROMIUM_PATH"];
  return chromium.launch(executablePath ? { executablePath } : {});
};

export const shot = (page: Page, name: string) => page.screenshot({ path: new URL(`./shots/${name}.png`, import.meta.url).pathname, fullPage: true });

/** Inline scripts on the page. Script files (`/webauthn.js`, `/passkey.js`) are allowed; rule 12 forbids inline code. */
export const scripts = (page: Page): Promise<number> => page.locator("script:not([src])").count();

/** Signs up a new person through the sign-up page and returns their email. */
export async function signUpThroughPage(page: Page, name = "Ada Lovelace"): Promise<string> {
  const email = `e2e-${randomUUID()}@example.com`;
  await page.goto(`${BASE}/sign-up`);
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: /sign up/i }).click();
  await page.waitForLoadState("networkidle");
  return email;
}

/**
 * Starts the e2e server and a browser. Files run one after another (`--no-file-parallelism`), so each file
 * owns port 18788 while it runs. Set E2E_BASE_URL to test a server you started yourself instead.
 */
export async function startE2e(): Promise<{ browser: Browser; stop: () => Promise<void> }> {
  const stopServer = process.env["E2E_BASE_URL"] ? async () => {} : await startServer();
  const browser = await launch();
  return {
    browser,
    stop: async () => {
      await browser.close();
      await stopServer();
    },
  };
}
