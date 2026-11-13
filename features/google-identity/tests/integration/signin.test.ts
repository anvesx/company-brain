import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { startApp } from "../support/app.js";
import { Browser } from "../support/browser.js";
import { skip } from "../support/db.js";

type App = Awaited<ReturnType<typeof startApp>>;
let app: App;
beforeAll(async () => {
  if (!skip) app = await startApp();
});
afterAll(async () => {
  if (!skip) await app.close();
});

const session = async (browser: Browser, a: App) =>
  (await (await browser.send(`${a.base}/api/auth/get-session`)).json()) as { user: { email: string; emailVerified: boolean } } | null;

describe.skipIf(skip)("Continue with Google against a real OIDC server and Postgres", () => {
  test("a verified Google email signs in, and the session is a Postgres row", async () => {
    app.oidc.signInAs("alice", { email: "alice@example.com", verified: true });
    const browser = new Browser(app.base, app.local);
    await browser.continueWithGoogle();
    expect(browser.trail.some((u) => u.startsWith(app.oidc.issuer))).toBe(true);
    expect((await session(browser, app))?.user).toMatchObject({ email: "alice@example.com", emailVerified: true });
    const rows = await app.pool.query(
      `SELECT u.email, a."providerId", count(s.id)::int AS sessions FROM "user" u
       JOIN account a ON a."userId" = u.id LEFT JOIN session s ON s."userId" = u.id GROUP BY u.email, a."providerId"`,
    );
    expect(rows.rows).toEqual([{ email: "alice@example.com", providerId: "google", sessions: 1 }]);
  });

  test("signing in again reuses the user and adds a second session", async () => {
    app.oidc.signInAs("alice", { email: "alice@example.com", verified: true });
    await new Browser(app.base, app.local).continueWithGoogle();
    const { rows } = await app.pool.query(`SELECT (SELECT count(*)::int FROM "user") AS users, (SELECT count(*)::int FROM session) AS sessions`);
    expect(rows[0]).toEqual({ users: 1, sessions: 2 });
  });

  test("an unverified Google email creates no user and no session", async () => {
    app.oidc.signInAs("mallory", { email: "mallory@example.com", verified: false });
    const browser = new Browser(app.base, app.local);
    await browser.continueWithGoogle();
    expect(await session(browser, app)).toBeNull();
    const { rows } = await app.pool.query(`SELECT count(*)::int AS n FROM "user" WHERE email = 'mallory@example.com'`);
    expect(rows[0].n).toBe(0);
  });

  test("sign-out ends the session in Postgres", async () => {
    app.oidc.signInAs("bob", { email: "bob@example.com", verified: true });
    const browser = new Browser(app.base, app.local);
    await browser.continueWithGoogle();
    const out = await browser.send(`${app.base}/api/auth/sign-out`, {
      method: "POST",
      headers: { origin: app.base, "content-type": "application/json" },
      body: "{}",
    });
    expect(out.status).toBe(200);
    expect(await session(browser, app)).toBeNull();
    const { rows } = await app.pool.query(`SELECT count(*)::int AS n FROM session s JOIN "user" u ON u.id = s."userId" WHERE u.email = 'bob@example.com'`);
    expect(rows[0].n).toBe(0);
  });

  test("a cross-site post to the button is refused", async () => {
    const res = await fetch(`${app.local}/sign-in/google`, { method: "POST", headers: { origin: "https://evil.example" }, redirect: "manual" });
    expect(res.status).toBe(403);
  });

  test("when Google cannot be reached the button answers 502, not a crash", async () => {
    const lonely = await startApp();
    await lonely.oidc.close();
    const res = await fetch(`${lonely.local}/sign-in/google`, { method: "POST", headers: { origin: lonely.base }, redirect: "manual" });
    expect(res.status).toBe(502);
    await lonely.close();
  });
});
