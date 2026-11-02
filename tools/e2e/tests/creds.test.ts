import { expect, test } from "@playwright/test";
import { mint } from "../src/creds.ts";

test("mint makes a bearer the running server accepts, for the user and tenant given", async ({ request }) => {
  const res = await request.get("/v1/accounts", { headers: { authorization: `Bearer ${mint("cora", "t9")}` } });
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ accounts: [] });
});

test("mint output has four parts and a future expiry", () => {
  const [user, tenant, exp, sig] = mint("ann").split(":");
  expect([user, tenant]).toEqual(["ann", "t1"]);
  expect(Number(exp)).toBeGreaterThan(Date.now() / 1000);
  expect(sig).toMatch(/^[0-9a-f]{64}$/);
});
