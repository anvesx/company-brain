import { describe, expect, it } from "vitest";
import { isLoopback, readTokenPolicy, requireAuthMode } from "../../src/auth/mode.js";
import { readEnv } from "../../src/config/index.js";

const secret = "k".repeat(32);

describe("unsigned tokens", () => {
  it.each(["127.0.0.1", "localhost", "::1", "[::1]", "127.9.9.9"])("%s is loopback", (host) => expect(isLoopback(host)).toBe(true));
  it.each(["0.0.0.0", "::", "10.0.0.5", "brain.example.com", "127.0.0.1.evil.com"])("%s is not loopback", (host) => expect(isLoopback(host)).toBe(false));
  it("are allowed only in demo on loopback", () => {
    expect(() => requireAuthMode(readEnv({ BRAIN_DEMO: "1" }))).not.toThrow();
    expect(() => requireAuthMode(readEnv({ BRAIN_DEMO: "1", BRAIN_HOST: "localhost" }))).not.toThrow();
  });
  it("are refused on a non-loopback host even in demo", () => {
    expect(() => requireAuthMode(readEnv({ BRAIN_DEMO: "1", BRAIN_HOST: "0.0.0.0" }))).toThrow("BRAIN_AUTH_SECRET");
  });
  it("are refused outside demo, loopback or not", () => {
    expect(() => requireAuthMode(readEnv({ BRAIN_FOLDER_ROOT: "/c", BRAIN_TENANT: "acme" }))).toThrow("BRAIN_AUTH_SECRET");
  });
  it("a secret is always enough", () => {
    expect(() => requireAuthMode(readEnv({ BRAIN_HOST: "0.0.0.0", BRAIN_AUTH_SECRET: secret }))).not.toThrow();
  });
});

describe("readTokenPolicy", () => {
  it("defaults to a 24 hour maximum lifetime and no extra keys", () => {
    expect(readTokenPolicy({})).toEqual({ maxLifetimeSeconds: 86_400 });
  });
  it("reads keys and a maximum lifetime", () => {
    const keys = { k1: "a".repeat(32) };
    expect(readTokenPolicy({ BRAIN_AUTH_KEYS: JSON.stringify(keys), BRAIN_TOKEN_MAX_TTL_SECONDS: "600" })).toEqual({ keys, maxLifetimeSeconds: 600 });
  });
  it.each(["not json", "[]", '{"k":"short"}', `{"bad kid":"${"a".repeat(32)}"}`])("rejects BRAIN_AUTH_KEYS %j", (raw) => {
    expect(() => readTokenPolicy({ BRAIN_AUTH_KEYS: raw })).toThrow("BRAIN_AUTH_KEYS");
  });
  it.each(["0", "-5", "x"])("rejects a maximum lifetime of %j", (raw) => {
    expect(() => readTokenPolicy({ BRAIN_TOKEN_MAX_TTL_SECONDS: raw })).toThrow("BRAIN_TOKEN_MAX_TTL_SECONDS");
  });
});
