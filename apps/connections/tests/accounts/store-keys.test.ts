import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseKey } from "../../src/accounts/rules/crypto.js";
import { openStore } from "../../src/accounts/store.js";
import { input, key, tempStore } from "./fixture.js";

let t: ReturnType<typeof tempStore>;
beforeEach(() => {
  t = tempStore();
});
afterEach(() => t.done());

describe("store secrets and keys", () => {
  it("keeps the secret encrypted on disk", () => {
    t.store.create(input);
    expect(readFileSync(t.path).includes("ghp_one")).toBe(false);
  });
  it("persists across reopen and refuses a different key", () => {
    const a = t.store.create(input);
    const again = openStore(t.path, key);
    expect(again.get(a.id)?.label).toBe("work");
    again.close();
    const wrong = openStore(t.path, parseKey("cd".repeat(32)));
    expect(() => wrong.credential(a.id)).toThrow();
    wrong.close();
  });
  it("lists active secrets with their owner for the token file", () => {
    const a = t.store.create(input);
    const b = t.store.create({ ...input, owner: "bob", secret: "ghp_two" });
    t.store.setStatus(b.id, "needs-auth");
    expect(t.store.secrets()).toEqual([{ owner: "ann", provider: "github", kind: "pat", secret: "ghp_one", id: a.id }]);
  });
});
