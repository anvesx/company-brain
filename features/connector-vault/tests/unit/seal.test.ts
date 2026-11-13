import { describe, expect, test } from "vitest";
import { loadKeyring, open, seal, type VaultError } from "../../src/index.js";
import { hex } from "../support/db.js";

const ring = loadKeyring(`k1:${hex()}`);
const code = (f: () => unknown) => {
  try {
    f();
  } catch (e) {
    return (e as VaultError).code;
  }
};

describe("seal", () => {
  test("round trips and carries the key id", () => {
    const s = seal(ring, "row-1", "secret-token");
    expect(s.startsWith("k1.")).toBe(true);
    expect(open(ring, "row-1", s)).toBe("secret-token");
    expect(s).not.toContain("secret-token");
  });
  test("a value moved to another row id does not open (AAD)", () => {
    expect(code(() => open(ring, "row-2", seal(ring, "row-1", "x")))).toBe("UNSEALABLE");
  });
  test("a tampered byte, a short value and an unknown key id fail", () => {
    const s = seal(ring, "r", "x");
    const flipped = `${s.slice(0, -2)}${s.endsWith("A=") ? "B=" : "A="}`;
    expect(code(() => open(ring, "r", flipped))).toBe("UNSEALABLE");
    expect(code(() => open(ring, "r", "k1.AAAA"))).toBe("UNSEALABLE");
    expect(code(() => open(loadKeyring(`k9:${hex()}`), "r", s))).toBe("UNSEALABLE");
    expect(code(() => open(ring, "r", "nodot"))).toBe("UNSEALABLE");
  });
  test("the same plaintext seals differently each time", () => {
    expect(seal(ring, "r", "x")).not.toBe(seal(ring, "r", "x"));
  });
});

describe("keyring", () => {
  const key = hex();
  test("first entry is current, later entries only open", () => {
    const r = loadKeyring(`new:${hex()},old:${key}`);
    expect(r.current.kid).toBe("new");
    expect(r.byId.size).toBe(2);
  });
  test.each([[undefined], [""], ["nokid"], ["k1:short"], ["bad kid:" + hex()], [`k1:${key},k1:${hex()}`], [`k1:${key}:extra`]])("rejects %s", (raw) => {
    expect(code(() => loadKeyring(raw))).toBe("BAD_KEY");
  });
  test("refuses a key equal to BRAIN_AUTH_SECRET, hex or raw bytes", () => {
    expect(code(() => loadKeyring(`k1:${key}`, key.toUpperCase()))).toBe("BAD_KEY");
    expect(code(() => loadKeyring(`k1:${"41".repeat(32)}`, "A".repeat(32)))).toBe("BAD_KEY");
    expect(loadKeyring(`k1:${key}`, "something-else").current.kid).toBe("k1");
  });
  test("error text never contains the key", () => {
    try {
      loadKeyring(`k1:${key},k1:${key}`);
    } catch (e) {
      expect(String(e)).not.toContain(key);
    }
  });
});
