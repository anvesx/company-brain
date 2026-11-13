import { describe, expect, test } from "vitest";
import { loadKeyring, seal, type VaultError } from "../../src/index.js";
import { decodeKey } from "../../src/seal/keyring.js";
import { hex } from "../support/db.js";

const code = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    return (e as VaultError).code;
  }
};

describe("key length", () => {
  test("decodeKey returns exactly 32 bytes or throws BAD_KEY", () => {
    expect(decodeKey(hex()).length).toBe(32);
    expect(code(() => decodeKey("abcd"))).toBe("BAD_KEY");
    expect(code(() => decodeKey(`${hex()}00`))).toBe("BAD_KEY");
  });
});

describe("seal limit per key", () => {
  test("throws KEY_EXHAUSTED at the limit; counters are per key id", () => {
    const ring = loadKeyring(`k1:${hex()}`, undefined, 2);
    seal(ring, "r", "a");
    seal(ring, "r", "b");
    expect(code(() => seal(ring, "r", "c"))).toBe("KEY_EXHAUSTED");
    const next = loadKeyring(`k2:${hex()},k1:${hex()}`, undefined, 2);
    expect(code(() => seal(next, "r", "d"))).toBeUndefined();
  });
  test("the default limit is 2^32 (NIST SP 800-38D)", () => {
    expect(loadKeyring(`k1:${hex()}`).maxSeals).toBe(2 ** 32);
  });
});
