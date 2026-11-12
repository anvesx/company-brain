import { describe, expect, test } from "vitest";
import { parseConfig } from "../../src/config.js";

// The pool is never used here: config validation is pure, so a plain object of the right shape is the real input type.
const base = { pool: {} as never, baseUrl: "http://localhost:3000", secret: "s".repeat(32), clientId: "id", clientSecret: "secret" };

describe("parseConfig", () => {
  test("defaults to Google's issuer and development mode", () => {
    expect(parseConfig(base)).toMatchObject({ issuer: "https://accounts.google.com", production: false, trustedProxies: [] });
  });
  test("a short secret is refused", () => {
    expect(() => parseConfig({ ...base, secret: "short" })).toThrow(/secret/);
  });
  test("production needs https and trusted proxies", () => {
    expect(() => parseConfig({ ...base, production: true })).toThrow(/baseUrl[\s\S]*trustedProxies/);
  });
  test("production with https and proxies is accepted", () => {
    expect(parseConfig({ ...base, baseUrl: "https://brain.example.test", production: true, trustedProxies: ["10.0.0.0/8"] }).production).toBe(true);
  });
});
