import http from "node:http";
import { expect, test } from "@playwright/test";
import { mint, PORT } from "../../src/creds.ts";

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
});

// Playwright normalises dot segments before sending, so these go out as written over a raw socket.
const rawStatus = (path: string) =>
  new Promise<{ status: number; body: string }>((resolve, reject) => {
    const req = http.get({ host: "127.0.0.1", port: PORT, path }, (res) => {
      let body = "";
      res.on("data", (c) => {
        body += c;
      });
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on("error", reject);
  });

test("a path that climbs out of /ui is refused, however the dots are written", async () => {
  const ups = ["..", "%2e%2e", "%2e%2e%2f..", "..%2f.."];
  const paths = ups.flatMap((u) => [2, 3, 4].map((n) => `/ui/${Array(n).fill(u).join("/")}/package.json`));
  for (const path of paths) {
    const { status, body } = await rawStatus(path);
    expect(status, path).not.toBe(200);
    expect(body, path).not.toContain("@anvesx");
  }
  expect((await rawStatus("/ui/js/main.js")).status).toBe(200);
});
