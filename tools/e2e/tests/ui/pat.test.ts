import { expect, test } from "@playwright/test";
import { signIn } from "../../src/ui.ts";

async function addPat(page: import("@playwright/test").Page, label: string, token: string, zone = "private") {
  await page.getByRole("link", { name: "Add connection" }).first().click();
  await page.locator("#provider").selectOption("github");
  await page.locator("#kind").selectOption("pat");
  await page.locator("#label").fill(label);
  await page.locator("#token").fill(token);
  await page.locator("#dataZone").selectOption(zone);
  await page.getByRole("button", { name: "Add connection" }).last().click();
}

test("a member connects GitHub with a token and sees it listed without the secret", async ({ page }) => {
  await signIn(page, "ann");
  await addPat(page, "ui work github", "ghp_ui_secret_1");
  await expect(page).toHaveURL(/#\/account\/.+/);
  await expect(page.getByRole("heading", { name: "ui work github" })).toBeVisible();
  await expect(page.locator("dl.facts")).toContainText("pat");
  await page.screenshot({ path: "test-results/account-detail.png" });
  await page.locator("#nav").getByRole("link", { name: "All connections" }).click();
  const card = page.locator(".card", { hasText: "ui work github" });
  await expect(card).toContainText("owned by ann");
  await expect(card).toContainText("never");
  await expect(page.locator("body")).not.toContainText("ghp_ui_secret_1");
});

test("a non-admin who asks for a company data zone is refused with the reason", async ({ page }) => {
  await signIn(page, "bob");
  await addPat(page, "ui too wide", "ghp_ui_secret_2", "company");
  await expect(page.locator("#msg")).toContainText(/admin/);
  await expect(page).toHaveURL(/#\/add$/);
  await page.locator("#nav").getByRole("link", { name: "All connections" }).click();
  await expect(page.locator(".card", { hasText: "ui too wide" })).toHaveCount(0);
});

test("an admin may choose the company data zone", async ({ page }) => {
  await signIn(page, "root");
  await addPat(page, "ui company repo", "ghp_ui_secret_3", "company");
  await expect(page).toHaveURL(/#\/account\/.+/);
  await expect(page.locator("dl.facts")).toContainText("root");
});

test("a bearer the server rejects keeps the user on the sign-in form", async ({ page }) => {
  await page.goto("/");
  await page.locator("#bearer").fill("ann:t1:9999999999:deadbeef");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator("#signin-note")).toContainText("not accepted");
  await expect(page.locator("#nav")).toBeHidden();
});
