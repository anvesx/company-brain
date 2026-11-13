import { describe, expect, it } from "vitest";
import { parseConfig } from "../../src/cli/config.js";

const ok = {
  CONNECTIONS_DATABASE_URL: "postgres://x@127.0.0.1:1/y",
  CONNECTOR_VAULT_KEYS: `k1:${"ab".repeat(32)}`,
  CONNECTIONS_AUTH_SECRET: "s".repeat(32),
  CONNECTIONS_DB_PATH: "/tmp/c.db",
  CONNECTIONS_GRAPH_PATH: "/tmp/g.db",
  CONNECTIONS_ADMINS: "t1:root, t2:boss",
};
const bad = (patch: Record<string, string | undefined>) => () => parseConfig({ ...ok, ...patch });

describe("parseConfig", () => {
  it("reads secret, paths, the admin list and the data settings with their defaults", () => {
    const c = parseConfig(ok);
    expect(c).toMatchObject({ secret: "s".repeat(32), dbPath: "/tmp/c.db", graphPath: "/tmp/g.db", port: 8788 });
    expect([...c.admins].sort()).toEqual(["t1:root", "t2:boss"]);
    expect(c.data).toMatchObject({ cursorPath: "/tmp/c.db.cursors", jobs: { pollMinutes: 15, tenantConcurrency: 2, maxBacklogPerTenant: 500 } });
    expect(c.data.webhookSecret).toBeUndefined();
  });
  it("accepts an empty admin list and a port", () => {
    const c = parseConfig({ ...ok, CONNECTIONS_ADMINS: undefined, CONNECTIONS_PORT: "0" });
    expect([c.port, c.admins.size]).toEqual([0, 0]);
  });
  it("refuses a missing database url and a missing or malformed vault key", () => {
    expect(bad({ CONNECTIONS_DATABASE_URL: undefined })).toThrow(/CONNECTIONS_DATABASE_URL/);
    expect(bad({ CONNECTOR_VAULT_KEYS: undefined })).toThrow(/CONNECTOR_VAULT_KEYS/);
    expect(bad({ CONNECTOR_VAULT_KEYS: "abc" })).toThrow(/CONNECTOR_VAULT_KEYS/);
  });
  it("reads the webhook secret and the job limits, and refuses weak or out-of-range ones", () => {
    const env = {
      CONNECTIONS_GITHUB_WEBHOOK_SECRET: "w".repeat(16),
      CONNECTIONS_POLL_MINUTES: "5",
      CONNECTIONS_TENANT_CONCURRENCY: "4",
      CONNECTIONS_MAX_BACKLOG_PER_TENANT: "10",
      CONNECTIONS_CURSOR_PATH: "/tmp/cur.db",
    };
    const c = parseConfig({ ...ok, ...env });
    expect(c.data).toMatchObject({ webhookSecret: "w".repeat(16), cursorPath: "/tmp/cur.db" });
    expect(c.data.jobs).toMatchObject({ pollMinutes: 5, tenantConcurrency: 4, maxBacklogPerTenant: 10 });
    expect(bad({ CONNECTIONS_GITHUB_WEBHOOK_SECRET: "short" })).toThrow(/WEBHOOK_SECRET/);
    expect(bad({ CONNECTIONS_POLL_MINUTES: "60" })).toThrow(/POLL_MINUTES/);
    expect(bad({ CONNECTIONS_POLL_MINUTES: "0" })).toThrow(/POLL_MINUTES/);
    expect(bad({ CONNECTIONS_TENANT_CONCURRENCY: "x" })).toThrow(/TENANT_CONCURRENCY/);
    expect(bad({ CONNECTIONS_MAX_BACKLOG_PER_TENANT: "-1" })).toThrow(/MAX_BACKLOG/);
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
    expect(() => parseConfig({})).toThrow(/CONNECTIONS_AUTH_SECRET.*CONNECTIONS_DB_PATH.*CONNECTIONS_GRAPH_PATH.*CONNECTIONS_DATABASE_URL/s);
  });
});
