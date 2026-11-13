import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { startApp } from "../support/app.js";
import { skip } from "../support/db.js";

type App = Awaited<ReturnType<typeof startApp>>;
let app: App;
beforeAll(async () => {
  if (!skip) app = await startApp();
});
afterAll(async () => {
  if (!skip) await app.close();
});

const CLOSED = [
  ["POST", "/api/auth/sign-in/email"],
  ["POST", "/api/auth/sign-up/email"],
  ["POST", "/api/auth/sign-in/oauth2"],
  ["GET", "/api/auth/callback/github"],
  ["POST", "/api/auth/forget-password"],
  ["POST", "/api/auth/request-password-reset"],
  ["POST", "/api/auth/reset-password"],
  ["POST", "/api/auth/change-password"],
  ["POST", "/api/auth/set-password"],
  ["POST", "/api/auth/passkey/generate-authenticate-options"],
  ["POST", "/api/auth/passkey/verify-authentication"],
  ["GET", "/api/auth/passkey/list-user-passkeys"],
  ["POST", "/api/auth/jwks"],
  ["GET", "/api/auth/reset-password/token"],
  ["GET", "/sign-up"],
  ["GET", "/password"],
  ["GET", "/forgot-password"],
] as const;

describe.skipIf(skip)("no password, email-password or passkey door exists", () => {
  test.each(CLOSED)("%s %s is a 404", async (method, path) => {
    const res = await fetch(`${app.local}${path}`, {
      method,
      headers: { "content-type": "application/json", origin: app.base },
      body: method === "POST" ? "{}" : null,
    });
    expect(res.status).toBe(404);
  });

  test("the sign-in page has exactly one button and no input", async () => {
    const html = await (await fetch(`${app.local}/sign-in`)).text();
    expect(html.match(/<button/g)).toHaveLength(1);
    expect(html).toContain("Continue with Google");
    expect(html).not.toMatch(/<input|<textarea|<select|type=["']?(password|email)|passkey|webauthn/i);
  });

  test("the live auth routes list has no password or passkey endpoint", async () => {
    const all = Object.keys(app.auth.api);
    const bad = all.filter(
      (name) =>
        /passkey|webauthn/i.test(name) ||
        (/password/i.test(name) &&
          !/resetPassword|requestPasswordReset|forgetPassword|changePassword|setPassword|verifyPassword|signInEmail|signUpEmail/.test(name)),
    );
    expect(bad).toEqual([]);
  });

  test("email and password sign-in is switched off in better-auth itself", async () => {
    const res = await app.auth.handler(
      new Request(`${app.local}/api/auth/sign-in/email`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: app.base },
        body: JSON.stringify({ email: "a@b.co", password: "x".repeat(12) }),
      }),
    );
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).not.toBe(200);
  });
});
