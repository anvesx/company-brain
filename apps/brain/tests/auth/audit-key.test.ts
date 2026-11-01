import { describe, expect, it } from "vitest";
import { DEMO_AUDIT_KEY, resolveAuditKey } from "../../src/auth/audit-key.js";

const key = "k".repeat(32);
const run = (env: Record<string, string | undefined>) => {
  const warnings: string[] = [];
  return { key: () => resolveAuditKey(env, (m) => warnings.push(m)), warnings };
};

describe("resolveAuditKey", () => {
  it("pure demo mode falls back to the public constant and warns on stderr", () => {
    const r = run({ BRAIN_DEMO: "1" });
    expect(r.key()).toBe(DEMO_AUDIT_KEY);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toContain("BRAIN_AUDIT_KEY");
  });
  it("uses a supplied key in demo mode without warning", () => {
    const r = run({ BRAIN_AUDIT_KEY: "short" });
    expect(r.key()).toBe("short");
    expect(r.warnings).toEqual([]);
  });
  it.each([{ BRAIN_AUTH_SECRET: "a".repeat(32) }, { BRAIN_DATA_DIR: "/data" }])("requires the key when %j is set", (env) => {
    expect(() => run(env).key()).toThrow("BRAIN_AUDIT_KEY");
    expect(() => run({ ...env, BRAIN_AUDIT_KEY: "" }).key()).toThrow("BRAIN_AUDIT_KEY");
    expect(() => run({ ...env, BRAIN_AUDIT_KEY: "k".repeat(31) }).key()).toThrow("at least 32");
    expect(run({ ...env, BRAIN_AUDIT_KEY: key }).key()).toBe(key);
  });
  it("an empty BRAIN_DATA_DIR counts as unset, like readEnv", () => {
    expect(run({ BRAIN_DATA_DIR: "" }).key()).toBe(DEMO_AUDIT_KEY);
  });
  it("never falls back to the constant in persistent mode", () => {
    const r = run({ BRAIN_DATA_DIR: "/d", BRAIN_AUDIT_KEY: key });
    expect(r.key()).not.toBe(DEMO_AUDIT_KEY);
    expect(r.warnings).toEqual([]);
  });
});
