import { describe, expect, it } from "vitest";
import { loginFromEnv } from "../../../src/cli/login-env.js";

const all = {
  LOGIN_DATABASE_URL: "postgres://x/y",
  LOGIN_SECRET: "s".repeat(32),
  LOGIN_GOOGLE_CLIENT_ID: "id",
  LOGIN_GOOGLE_CLIENT_SECRET: "secret",
  CONNECTIONS_PUBLIC_URL: "https://c.example.com/",
};

describe("loginFromEnv", () => {
  it("means no page when no LOGIN_ setting is present", () => {
    expect(loginFromEnv({})).toEqual({ errors: [] });
  });
  it("names every missing setting when only some are present", () => {
    const r = loginFromEnv({ LOGIN_SECRET: "x" });
    expect(r.login).toBeUndefined();
    expect(r.errors[0]).toMatch(/LOGIN_DATABASE_URL.*LOGIN_GOOGLE_CLIENT_ID.*LOGIN_GOOGLE_CLIENT_SECRET.*CONNECTIONS_PUBLIC_URL/);
  });
  it("reads a full set, trimming the slash and splitting proxies", () => {
    const r = loginFromEnv({ ...all, CONNECTIONS_PRODUCTION: "1", CONNECTIONS_TRUSTED_PROXIES: "10.0.0.0/8, 1.2.3.4" });
    expect(r.login).toMatchObject({ baseUrl: "https://c.example.com", production: true, trustedProxies: ["10.0.0.0/8", "1.2.3.4"] });
  });
});
