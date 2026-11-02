import { expect, test } from "@playwright/test";
import { mint } from "../../src/creds.ts";
import { signIn } from "../../src/ui.ts";

test("the add form offers the catalog's apps, and a new custom connector appears after reload", async ({ page, request }) => {
  await signIn(page, "ann");
  await page.getByRole("link", { name: "Add connection" }).first().click();
  const options = page.locator("#provider option");
  await expect(options.filter({ hasText: "GitHub" })).toHaveCount(1);
  await expect(options).not.toContainText(["Wiki ui-wiki"]);

  const body = { id: "ui-wiki", name: "Wiki ui-wiki", auth: { kind: "pat" }, endpoint: "https://wiki.example.test" };
  const authorization = `Bearer ${mint("root")}`;
  expect((await request.post("/v1/catalog", { headers: { authorization }, data: body })).status()).toBe(201);

  await page.reload();
  await expect(page.locator("#provider option", { hasText: "Wiki ui-wiki" })).toHaveCount(1);
  await page.locator("#provider").selectOption("ui-wiki");
  await expect(page.locator("#kind")).toHaveValue("pat");
  await page.screenshot({ path: "test-results/add-custom.png" });
});

test("the list filters by data zone", async ({ page }) => {
  await signIn(page, "ann");
  await page.getByRole("link", { name: "Add connection" }).first().click();
  await page.locator("#provider").selectOption("github");
  await page.locator("#kind").selectOption("pat");
  await page.locator("#label").fill("zone filter personal");
  await page.locator("#token").fill("ghp_ui_secret_4");
  await page.locator("#dataZone").selectOption("personal");
  await page.getByRole("button", { name: "Add connection" }).last().click();
  await page.getByRole("link", { name: "All connections" }).click();
  await page.locator("#f-zone").selectOption("private");
  await expect(page.locator(".card", { hasText: "zone filter personal" })).toHaveCount(0);
  await page.locator("#f-zone").selectOption("personal");
  await expect(page.locator(".card", { hasText: "zone filter personal" })).toHaveCount(1);
});
