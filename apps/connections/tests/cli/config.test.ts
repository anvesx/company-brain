import { describe, expect, it } from "vitest";
import { parseConfig } from "../../src/cli/config.js";

const ok = {
  CONNECTIONS_KEY: "ab".repeat(32),
  CONNECTIONS_AUTH_SECRET: "s".repeat(32),
  CONNECTIONS_DB_PATH: "/tmp/c.db",
  CONNECTIONS_GRAPH_PATH: "/tmp/g.db",
  CONNECTIONS_ADMINS: "t1:root, t2:boss",
};
const bad = (patch: Record<string, string | undefined>) => () => parseConfig({ ...ok, ...patch });

describe("parseConfig", () => {
  it("reads key, secret, paths and the admin list", () => {
    const c = parseConfig(ok);
    expect(c.key.equals(Buffer.from("ab".repeat(32), "hex"))).toBe(true);
    expect(c).toMatchObject({ secret: "s".repeat(32), dbPath: "/tmp/c.db", graphPath: "/tmp/g.db", port: 8788 });
    expect([...c.admins].sort()).toEqual(["t1:root", "t2:boss"]);
    expect(c.tokensFile).toBeUndefined();
  });
  it("accepts an empty admin list, a port and a tokens file", () => {
    const c = parseConfig({ ...ok, CONNECTIONS_ADMINS: undefined, CONNECTIONS_PORT: "0", CONNECTIONS_TOKENS_FILE: "/tmp/t.json" });
    expect(c).toMatchObject({ port: 0, tokensFile: "/tmp/t.json" });
    expect(c.admins.size).toBe(0);
  });
  it("refuses a missing or malformed key", () => {
    expect(bad({ CONNECTIONS_KEY: undefined })).toThrow(/CONNECTIONS_KEY/);
    expect(bad({ CONNECTIONS_KEY: "abc" })).toThrow(/CONNECTIONS_KEY/);
  });
  it("refuses a missing or short auth secret", () => {
    expect(bad({ CONNECTIONS_AUTH_SECRET: undefined })).toThrow(/CONNECTIONS_AUTH_SECRET/);
    expect(bad({ CONNECTIONS_AUTH_SECRET: "s".repeat(31) })).toThrow(/32/);
    expect(parseConfig({ ...ok, CONNECTIONS_AUTH_SECRET: "s".repeat(32) }).secret).toHaveLength(32);
  });
  it("refuses missing database and graph paths", () => {
    expect(bad({ CONNECTIONS_DB_PATH: undefined })).toThrow(/CONNECTIONS_DB_PATH/);
    expect(bad({ CONNECTIONS_GRAPH_PATH: "" })).toThrow(/CONNECTIONS_GRAPH_PATH/);
  });
  it("refuses a malformed admin entry and names it", () => {
    for (const a of ["root", "t1:", ":root", "t1:a:b", "t1:root,,"]) expect(bad({ CONNECTIONS_ADMINS: a })).toThrow(/CONNECTIONS_ADMINS/);
  });
  it("refuses a bad port", () => {
    for (const p of ["abc", "-1", "65536", "80.5", ""]) expect(bad({ CONNECTIONS_PORT: p })).toThrow(/CONNECTIONS_PORT/);
  });
  it("accepts port 65535 and keeps the GitHub API URL", () => {
    expect(parseConfig({ ...ok, CONNECTIONS_PORT: "65535", CONNECTIONS_GITHUB_API_URL: "http://gh.test" })).toMatchObject({
      port: 65535,
      githubApiUrl: "http://gh.test",
    });
  });
  it("keeps loopback connectors off unless CONNECTIONS_ALLOW_LOOPBACK is 1", () => {
    expect(parseConfig(ok).allowLoopback).toBe(false);
    expect(parseConfig({ ...ok, CONNECTIONS_ALLOW_LOOPBACK: "true" }).allowLoopback).toBe(false);
    expect(parseConfig({ ...ok, CONNECTIONS_ALLOW_LOOPBACK: "1" }).allowLoopback).toBe(true);
  });
  it("joins every problem with a semicolon, including the oauth ones", () => {
    expect(bad({ CONNECTIONS_PORT: "x", GITHUB_CLIENT_ID: "g" })).toThrow(/CONNECTIONS_PORT must be[^;]*; GITHUB_CLIENT_ID and/);
  });
  it("reports every problem at once", () => {
    expect(() => parseConfig({})).toThrow(/CONNECTIONS_KEY.*CONNECTIONS_AUTH_SECRET.*CONNECTIONS_DB_PATH.*CONNECTIONS_GRAPH_PATH/s);
  });
});
