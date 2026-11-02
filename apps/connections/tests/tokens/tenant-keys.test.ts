import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { userKey as brainKey } from "../../../brain/src/cli/user-key.js";
import { userKey } from "../../src/tokens/user-key.js";
import { writeTokenFile } from "../../src/tokens/write-token-file.js";
import { tempStore } from "../accounts/fixture.js";

const base = { provider: "github", label: "a", access: "private", dataZone: "private", kind: "pat" } as const;
let t: ReturnType<typeof tempStore>;
let file: string;
beforeEach(() => {
  t = tempStore();
  file = join(t.path, "..", "tokens.json");
});
afterEach(() => t.done());
const read = () => JSON.parse(readFileSync(file, "utf8")) as Record<string, Record<string, string>>;

describe("token file tenant keys", () => {
  it("keeps t1:ana and t2:ana apart, each with its own bare provider key", () => {
    t.store.create({ ...base, tenant: "t1", owner: "ana", secret: "ghp_t1" });
    t.store.create({ ...base, tenant: "t2", owner: "ana", secret: "ghp_t2" });
    expect(writeTokenFile(t.store, file)).toEqual({ users: 2, tokens: 2 });
    const all = read();
    expect(Object.keys(all).sort()).toEqual(["t1:ana", "t2:ana"]);
    expect(all["t1:ana"]?.github).toBe("ghp_t1");
    expect(all["t2:ana"]?.github).toBe("ghp_t2");
  });
  it("encodes tenant and user so neither part can traverse a path or fake the separator", () => {
    t.store.create({ ...base, tenant: "../x", owner: "a:b/../..", secret: "s1" });
    t.store.create({ ...base, tenant: "t", owner: "..", secret: "s2" });
    writeTokenFile(t.store, file);
    const keys = Object.keys(read());
    expect(keys.sort()).toEqual(["%2E%2E%2Fx:a%3Ab%2F%2E%2E%2F%2E%2E", "t:%2E%2E"]);
    for (const k of keys) expect(k).toMatch(/^[A-Za-z0-9%_-]+:[A-Za-z0-9%_-]+$/);
    expect(statSync(file).mode & 0o777).toBe(0o600);
  });
  it("uses the same key function as the brain reader", () => {
    for (const [tn, u] of [
      ["t1", "ana"],
      ["../x", "a:b"],
      ["é", ".."],
    ] as const)
      expect(userKey(tn, u)).toBe(brainKey(tn, u));
  });
  it("encodes a lone surrogate instead of throwing, and keeps it apart from U+FFFD", () => {
    for (const k of [userKey, brainKey]) {
      expect(k("t", "a\ud800b")).toBe("t:a%UD800b");
      expect(k("t", "a\ud800b")).not.toBe(k("t", "a\ufffdb"));
      expect(k("t", "\u{1f600}")).toBe("t:%F0%9F%98%80");
    }
  });
});
