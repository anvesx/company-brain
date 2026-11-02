import { describe, expect, it } from "vitest";
import { open, parseKey, seal } from "../../src/accounts/crypto.js";

const key = parseKey("ab".repeat(32));

describe("credential encryption", () => {
  it("round-trips a secret", () => {
    expect(open(key, "id1", seal(key, "id1", "ghp_secret"))).toBe("ghp_secret");
  });
  it("never writes the plaintext and uses a fresh iv each time", () => {
    const a = seal(key, "id1", "ghp_secret");
    expect(a).not.toContain("ghp_secret");
    expect(Buffer.from(a, "base64").toString("latin1")).not.toContain("ghp_secret");
    expect(seal(key, "id1", "ghp_secret")).not.toBe(a);
  });
  it("fails with the wrong key, a different account id, or a flipped byte", () => {
    const sealed = seal(key, "id1", "x");
    expect(() => open(parseKey("cd".repeat(32)), "id1", sealed)).toThrow();
    expect(() => open(key, "id2", sealed)).toThrow();
    const raw = Buffer.from(sealed, "base64");
    raw[raw.length - 1] = (raw[raw.length - 1] ?? 0) ^ 1;
    expect(() => open(key, "id1", raw.toString("base64"))).toThrow();
  });
  it("accepts only a 64 character hex key", () => {
    expect(() => parseKey(undefined)).toThrow(/CONNECTIONS_KEY/);
    expect(() => parseKey("short")).toThrow(/CONNECTIONS_KEY/);
    expect(() => parseKey("zz".repeat(32))).toThrow(/CONNECTIONS_KEY/);
  });
});
