import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { startApp } from "../support/app.js";
import { Browser } from "../support/browser.js";
import { skip } from "../support/db.js";

type App = Awaited<ReturnType<typeof startApp>>;
const PUBLIC = "https://brain.example.test";
let app: App;
beforeAll(async () => {
  if (!skip) app = await startApp({ production: true, trustedProxies: ["10.0.0.0/8"], publicBase: PUBLIC });
});
afterAll(async () => {
  if (!skip) await app.close();
});

const press = (forwardedFor: string) =>
  fetch(`${app.local}/sign-in/google`, { method: "POST", headers: { origin: PUBLIC, "x-forwarded-for": forwardedFor }, redirect: "manual" });

describe.skipIf(skip)("production mode", () => {
  test("session cookie is Secure, HttpOnly, SameSite=Lax and __Secure- prefixed", async () => {
    app.oidc.signInAs("carol", { email: "carol@example.com", verified: true });
    const browser = new Browser(PUBLIC, app.local);
    const start = await browser.send(`${PUBLIC}/sign-in/google`, { method: "POST", headers: { origin: PUBLIC } });
    expect(start.headers.getSetCookie().every((c) => /; Secure/i.test(c) && c.startsWith("__Secure-"))).toBe(true);
    let res = start;
    let at = `${PUBLIC}/sign-in/google`;
    const cookies: string[] = [];
    for (let hop = 0; hop < 12 && res.status >= 300 && res.status < 400; hop++) {
      at = new URL(res.headers.get("location") ?? "", at).toString();
      res = await browser.send(at);
      cookies.push(...res.headers.getSetCookie());
    }
    const session = cookies.find((c) => c.startsWith("__Secure-better-auth.session_token="));
    expect(session).toMatch(/; Secure/i);
    expect(session).toMatch(/; HttpOnly/i);
    expect(session).toMatch(/SameSite=Lax/i);
  });

  test("every page carries HSTS, CSP, no-sniff and a referrer policy", async () => {
    for (const path of ["/sign-in", "/nowhere", "/api/auth/sign-in/email"]) {
      const h = (await fetch(`${app.local}${path}`)).headers;
      expect(h.get("strict-transport-security")).toContain("max-age=");
      expect(h.get("content-security-policy")).toContain("default-src");
      expect(h.get("x-content-type-options")).toBe("nosniff");
      expect(h.get("referrer-policy")).toBe("no-referrer");
    }
  });

  test("the rate limit is keyed on the forwarded client address, not the proxy or a spoofed first hop", async () => {
    for (let i = 0; i < 5; i++) expect((await press("203.0.113.7, 10.1.1.1")).status).toBe(302);
    expect((await press("203.0.113.7, 10.1.1.1")).status).toBe(429);
    expect((await press("198.51.100.9, 203.0.113.7, 10.1.1.1")).status).toBe(429);
    expect((await press("203.0.113.8, 10.1.1.1")).status).toBe(302);
    const { rows } = await app.pool.query(`SELECT key FROM "rateLimit" ORDER BY key`);
    expect(rows.map((r) => r.key).join(" ")).toContain("203.0.113.7");
    expect(rows.map((r) => r.key).join(" ")).not.toContain("10.1.1.1");
    expect(rows.map((r) => r.key).join(" ")).not.toContain("198.51.100.9");
  });
});
