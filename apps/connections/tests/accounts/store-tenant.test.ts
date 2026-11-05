import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import { input, tempStore } from "./fixture.js";

let t: ReturnType<typeof tempStore>;
let id: string; // an account of tenant t1
const other = "t2"; // every call below asks as the wrong tenant and must see nothing
beforeEach(() => {
  t = tempStore();
  id = t.store.create(input).id;
});
afterEach(() => t.done());

// The row must be exactly as created: same label, still active, same secret, no sync time.
const untouched = () => {
  expect(t.store.get("t1", id)).toMatchObject({ label: "work", access: "private", dataZone: "private", status: "active", lastSyncAt: null });
  expect(t.store.credential("t1", id)).toBe("ghp_one");
};

describe("a wrong tenant behaves like an unknown id", () => {
  it("get", () => expect(t.store.get(other, id)).toBeUndefined());
  it("credential", () => expect(t.store.credential(other, id)).toBeUndefined());
  it("update", () => {
    expect(t.store.update(other, id, { label: "x", access: "company", dataZone: "company" })).toBeUndefined();
    untouched();
  });
  it("setLastSync", () => {
    t.store.setLastSync(other, id, 5);
    untouched();
  });
  it("setStatus", () => {
    t.store.setStatus(other, id, "needs-auth");
    untouched();
  });
  it("setCredential", () => {
    t.store.setCredential(other, id, "stolen");
    untouched();
  });
  it("remove", () => {
    expect(t.store.remove(other, id)).toBe(false);
    untouched();
  });
});

describe("the cross-tenant read", () => {
  it("is not on the Store type", () => {
    expectTypeOf(t.store).not.toHaveProperty("secrets");
    expectTypeOf(t.store).not.toHaveProperty("secretsOf");
    expectTypeOf(t.store).not.toHaveProperty("allSecrets");
  });
  it("is imported by the token-file writer only", () => {
    const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
    const users = walk(join(__dirname, "../../src")).filter((f) => f.endsWith(".ts") && /secretsOf/.test(readFileSync(f, "utf8")));
    expect(users.map((f) => f.split("/src/")[1]).sort()).toEqual(["accounts/secrets.ts", "tokens/write-token-file.ts"]);
  });
});
