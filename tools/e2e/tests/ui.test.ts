import { expect, test } from "@playwright/test";
import { signIn } from "../src/ui.ts";

test("signIn leaves the real page signed in as the user in the tenant", async ({ page }) => {
  await signIn(page, "dee");
  await expect(page.locator("#who")).toHaveText("dee in t1");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});
