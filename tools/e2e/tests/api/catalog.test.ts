import { expect, test } from "@playwright/test";
import { mint } from "../../src/creds.ts";

const as = (user: string, tenant = "t1") => ({ headers: { authorization: `Bearer ${mint(user, tenant)}` } });

test("the catalog lists the built-in apps with how each can be connected", async ({ request }) => {
  const res = await request.get("/v1/catalog", as("ann"));
  expect(res.status()).toBe(200);
  const { providers } = await res.json();
  const byId = Object.fromEntries(providers.map((p: { id: string }) => [p.id, p]));
  expect(Object.keys(byId)).toEqual(expect.arrayContaining(["github", "drive", "slack", "gmail"]));
  expect(byId.github).toMatchObject({ custom: false, needsRepo: true });
  expect(byId.github.kinds).toContain("pat");
  expect(byId.drive.kinds).toContain("oauth");
});

test("the catalog needs a signed bearer", async ({ request }) => {
  expect((await request.get("/v1/catalog")).status()).toBe(401);
  const forged = { headers: { authorization: "Bearer ann:t1:9999999999:deadbeef" } };
  expect((await request.get("/v1/catalog", forged)).status()).toBe(401);
});

test("the page and its script are served with a strict content security policy", async ({ request }) => {
  const page = await request.get("/");
  expect(page.status()).toBe(200);
  expect(page.headers()["content-security-policy"]).toContain("default-src 'self'");
  expect((await request.get("/ui/js/main.js")).status()).toBe(200);
  expect((await request.get("/ui/../../package.json")).status()).toBe(404);
});
