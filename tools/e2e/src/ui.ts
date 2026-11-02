import type { Page } from "@playwright/test";
import { mint } from "./creds.ts";

/** Open the page and sign in through the real form with a freshly minted bearer. */
export async function signIn(page: Page, user: string): Promise<void> {
  await page.goto("/");
  await page.locator("#bearer").fill(mint(user));
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByRole("link", { name: "Add connection" }).first().waitFor();
}
