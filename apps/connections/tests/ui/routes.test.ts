import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { skip } from "../../../../features/google-identity/tests/support/db.js";
import { bootLogin } from "../login/harness.js";
import { bootUi } from "./fixture.js";

let s: Awaited<ReturnType<typeof bootUi>>;
let l: Awaited<ReturnType<typeof bootLogin>>;
beforeAll(async () => {
  s = await bootUi();
  if (!skip) l = await bootLogin();
});
afterAll(async () => {
  s.close();
  await l?.close();
});

/** The page as a signed-in browser gets it: `/` is behind Google sign-in. */
async function page(): Promise<Response> {
  l.oidc.signInAs("pat", { email: "pat@example.com", verified: true });
  const b = l.browser();
  await b.continueWithGoogle();
  return b.send(`${l.base}/`);
}

describe("the page", () => {
  it.skipIf(skip)("serves the html at / with a locked-down policy", async () => {
    const r = await page();
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toContain("text/html");
    expect(r.headers.get("content-security-policy")).toContain("default-src 'self'");
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(await r.text()).toContain('src="/ui/js/main.js"');
  });
  it.skipIf(skip)("serves every asset the page links with the right type", async () => {
    const html = await (await page()).text();
    const links = [...html.matchAll(/(?:src|href)="(\/ui\/[^"]+)"/g)].map((m) => m[1] as string);
    expect(links.length).toBeGreaterThanOrEqual(2);
    for (const l of links) {
      const r = await s.get(l);
      expect(r.status, l).toBe(200);
      expect(r.headers.get("content-type"), l).toContain(l.endsWith(".css") ? "text/css" : "text/javascript");
    }
  });
  it("does not serve folders, readmes, missing files or anything outside the asset folder", async () => {
    for (const p of [
      "/ui/js",
      "/ui/README.md",
      "/ui/nope.js",
      "/ui/../routes.ts",
      "/ui/%2e%2e/routes.ts",
      "/ui/js/..%2f..%2froutes.ts",
      "/ui/js/views/..%2f..%2f..%2froutes.ts",
    ]) {
      expect((await s.get(p)).status, p).toBe(404);
    }
  });
  it("has no page without login, only the API", async () => {
    expect((await s.get("/")).status).toBe(404);
  });
  it("leaves the API alone", async () => {
    expect((await s.get("/v1/accounts")).status).toBe(401);
  });
});
