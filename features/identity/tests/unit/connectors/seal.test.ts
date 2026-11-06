import { createDecipheriv, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { IdentityError, open, parseSealKey, seal } from "../../../src/index.js";

const HEX = "a".repeat(64);
const key = parseSealKey(HEX);

describe("connector token seal (connector-accounts rule 3)", () => {
  it("rule 3: seal then open gives back the token, and two seals of one token differ (fresh nonce)", () => {
    const first = seal(key, "accessToken", "at_secret-value");
    expect(open(key, "accessToken", first)).toBe("at_secret-value");
    expect(seal(key, "accessToken", "at_secret-value")).not.toBe(first);
    expect(first).not.toContain("secret-value");
  });

  it("rule 3: the format is base64 of a 12-byte nonce, a 16-byte GCM tag, then the ciphertext", () => {
    const raw = Buffer.from(seal(key, "refreshToken", "rt_123"), "base64");
    expect(raw.length).toBe(12 + 16 + Buffer.byteLength("rt_123"));
    const d = createDecipheriv("aes-256-gcm", Buffer.from(HEX, "hex"), raw.subarray(0, 12));
    d.setAAD(Buffer.from("refreshToken"));
    d.setAuthTag(raw.subarray(12, 28));
    expect(Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString("utf8")).toBe("rt_123");
  });

  it("rule 3: the wrong key, the wrong field or one flipped byte fails closed with a throw, never garbage", () => {
    const sealed = seal(key, "accessToken", "at_x");
    const other = parseSealKey(randomBytes(32).toString("hex"));
    expect(() => open(other, "accessToken", sealed)).toThrow();
    expect(() => open(key, "refreshToken", sealed)).toThrow();
    const raw = Buffer.from(sealed, "base64");
    raw[raw.length - 1] = (raw.at(-1) ?? 0) ^ 1;
    expect(() => open(key, "accessToken", raw.toString("base64"))).toThrow();
  });

  it("rule 3: a seal key that is not 64 hex characters is BAD_INPUT naming sealKey", () => {
    for (const bad of [undefined, "", "abc", "g".repeat(64), "a".repeat(63), "a".repeat(66)]) {
      const error = (() => {
        try {
          parseSealKey(bad);
        } catch (caught) {
          return caught;
        }
        return null;
      })();
      expect(error).toBeInstanceOf(IdentityError);
      expect([(error as IdentityError).code, (error as IdentityError).field]).toEqual(["BAD_INPUT", "sealKey"]);
    }
  });
});
