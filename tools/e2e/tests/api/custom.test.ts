import { expect, test } from "@playwright/test";
import { mint } from "../../src/creds.ts";

const as = (user: string, tenant = "t1") => ({ headers: { authorization: `Bearer ${mint(user, tenant)}` } });
const wiki = (id: string) => ({ id, name: `Wiki ${id}`, auth: { kind: "pat" }, endpoint: "https://wiki.example.test/api", canRead: true });

test("a tenant admin registers a custom connector; it shows in the catalog for that tenant only", async ({ request }) => {
  const made = await request.post("/v1/catalog", { ...as("root"), data: wiki("wiki-a") });
  expect(made.status()).toBe(201);
  expect(await made.json()).toMatchObject({ id: "wiki-a", custom: true, kinds: ["pat"] });
  const mine = await (await request.get("/v1/catalog", as("ann"))).json();
  expect(mine.providers.map((p: { id: string }) => p.id)).toContain("wiki-a");
  const other = await (await request.get("/v1/catalog", as("zed", "t2"))).json();
  expect(other.providers.map((p: { id: string }) => p.id)).not.toContain("wiki-a");
});

test("a non-admin gets 403 and nothing is registered", async ({ request }) => {
  const denied = await request.post("/v1/catalog", { ...as("ann"), data: wiki("wiki-b") });
  expect(denied.status()).toBe(403);
  expect(await denied.json()).toEqual({ error: "only a tenant admin can add a connector" });
  const list = await (await request.get("/v1/catalog", as("root"))).json();
  expect(list.providers.map((p: { id: string }) => p.id)).not.toContain("wiki-b");
});

test("a duplicate id or a built-in id is a 409", async ({ request }) => {
  expect((await request.post("/v1/catalog", { ...as("root"), data: wiki("wiki-c") })).status()).toBe(201);
  expect((await request.post("/v1/catalog", { ...as("root"), data: wiki("wiki-c") })).status()).toBe(409);
  expect((await request.post("/v1/catalog", { ...as("root"), data: wiki("github") })).status()).toBe(409);
});

test("a member of the tenant connects an account to the new connector with a token", async ({ request }) => {
  await request.post("/v1/catalog", { ...as("root"), data: wiki("wiki-d") });
  const made = await request.post("/v1/accounts", {
    ...as("ann"),
    data: { provider: "wiki-d", label: "team wiki", kind: "pat", token: "wiki_secret_1" },
  });
  expect(made.status()).toBe(201);
  const row = await made.json();
  expect(row).toMatchObject({ provider: "wiki-d", owner: "ann", access: "private" });
  expect(JSON.stringify(row)).not.toContain("wiki_secret_1");
});
