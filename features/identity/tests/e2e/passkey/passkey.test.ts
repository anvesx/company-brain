import type { Browser, Page } from "@playwright/test";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BASE, RUN, scripts, signUpThroughPage, startE2e } from "../support.js";

let browser: Browser;
let stop: () => Promise<void>;
beforeAll(async () => {
  if (RUN) ({ browser, stop } = await startE2e());
});
afterAll(() => stop?.());

const shot = (page: Page, name: string) => page.screenshot({ path: new URL(`./shots/${name}.png`, import.meta.url).pathname, fullPage: true });

/**
 * A virtual authenticator through the Chrome DevTools Protocol: a platform (Touch ID style) authenticator that
 * stores discoverable credentials, verifies the user, and taps "present" by itself. No real passkey is touched.
 */
async function virtualAuthenticator(page: Page): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
}

const signOut = async (page: Page) => {
  await page.goto(`${BASE}/connections`);
  await page.getByRole("button", { name: /sign out/i }).click();
  await page.waitForURL(/\/sign-in/);
};

describe.skipIf(!RUN)("browser: passkeys", () => {
  it("rule 16: add a passkey on the account page, sign out, sign in with it, then delete it", async () => {
    const page = await browser.newPage();
    await virtualAuthenticator(page);
    await signUpThroughPage(page, "Grace Hopper");
    await page.goto(`${BASE}/account`);
    expect(await scripts(page)).toBe(0);
    await page.getByLabel("Passkey name").fill("Test laptop");
    await page.getByRole("button", { name: /add a passkey/i }).click();
    // Success reloads the page; the new row shows the name typed above.
    await page.getByText("Test laptop").waitFor();
    await shot(page, "account-passkey");

    await signOut(page);
    await shot(page, "sign-in-passkey");
    await page.getByRole("button", { name: /sign in with a passkey/i }).click();
    await page.waitForURL(/\/connections/);
    await page.getByRole("link", { name: "Account" }).waitFor();

    await page.goto(`${BASE}/account`);
    await page.getByRole("button", { name: /delete/i }).click();
    await page.waitForURL(/\/account/);
    expect(await page.getByText("No passkeys yet.").isVisible()).toBe(true);
  });

  it("rule 16: with no passkey for this site the button fails in place and nobody is signed in", async () => {
    const page = await browser.newPage();
    await virtualAuthenticator(page);
    await page.goto(`${BASE}/sign-in`);
    await page.getByRole("button", { name: /sign in with a passkey/i }).click();
    const alert = page.locator("#passkey-error");
    await alert.waitFor({ state: "visible" });
    expect((await alert.textContent())?.length).toBeGreaterThan(0);
    expect(new URL(page.url()).pathname).toBe("/sign-in");
    await page.goto(`${BASE}/account`);
    await page.waitForURL(/\/sign-in/);
  });
});
