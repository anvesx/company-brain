import { expect, test } from "@playwright/test";
import { mint } from "../../src/creds.ts";

const as = (user: string) => ({ headers: { authorization: `Bearer ${mint(user)}` } });
const pat = { provider: "github", label: "work", kind: "pat", token: "ghp_test_token", access: "private", dataZone: "private" };
const post = (body: unknown, user = "ann") => ({ ...as(user), data: body });

test("catalog bodies that are wrong answer 400 with the reason", async ({ request }) => {
  const ok = { id: "bad-x", name: "X", auth: { kind: "pat" }, endpoint: "https://93.184.216.34" };
  const bad: [unknown, RegExp][] = [
    [{ ...ok, id: "Bad Id" }, /id must be/],
    [{ ...ok, endpoint: "http://x.example.test" }, /endpoint must be an https url/],
    [{ ...ok, auth: { kind: "oauth2", app: "github" } }, /authorizeURL|tokenURL/],
    [{ ...ok, extra: 1 }, /unknown fields: extra/],
    [{ ...ok, defaultZone: "company" }, /defaultZone must be/],
  ];
  for (const [body, why] of bad) {
    const res = await request.post("/v1/catalog", post(body, "root"));
    expect(res.status(), JSON.stringify(body)).toBe(400);
    expect((await res.json()).error).toMatch(why);
  }
});

test("account bodies that are wrong answer 400", async ({ request }) => {
  const bad = [
    { ...pat, provider: "nope" },
    { ...pat, label: "  " },
    { ...pat, token: "" },
    { ...pat, kind: "oauth" },
    { ...pat, dataZone: "everyone" },
    { ...pat, extra: true },
    { ...pat, repo: "not a repo" },
  ];
  for (const body of bad) expect((await request.post("/v1/accounts", post(body))).status(), JSON.stringify(body)).toBe(400);
});

test("a non-admin cannot widen to company or use an admin token; an admin can", async ({ request }) => {
  const wide = { ...pat, access: "company", dataZone: "company" };
  const refused = await request.post("/v1/accounts", post(wide));
  expect(refused.status()).toBe(403);
  expect((await refused.json()).error).toMatch(/admin/);
  expect((await request.post("/v1/accounts", post({ ...pat, kind: "admin-token" }))).status()).toBe(403);
  expect((await request.post("/v1/accounts", post(wide, "root"))).status()).toBe(201);
});

test("another owner's private account is a 404, and a missing bearer is a 401", async ({ request }) => {
  const made = await (await request.post("/v1/accounts", post({ ...pat, label: "only ann" }))).json();
  expect((await request.patch(`/v1/accounts/${made.id}`, { ...as("bob"), data: { label: "x" } })).status()).toBe(404);
  expect((await request.delete(`/v1/accounts/${made.id}`, as("bob"))).status()).toBe(404);
  expect((await request.get("/v1/accounts")).status()).toBe(401);
});
