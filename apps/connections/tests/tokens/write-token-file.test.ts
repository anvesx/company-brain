import { readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { writeTokenFile } from "../../src/tokens/write-token-file.js";
import { tempStore } from "../accounts/fixture.js";

const base = { tenant: "t1", provider: "github", label: "a", access: "private", dataZone: "private" } as const;
let t: ReturnType<typeof tempStore>;
let file: string;
beforeEach(() => {
  t = tempStore();
  file = join(t.path, "..", "tokens.json");
});
afterEach(() => t.done());
const read = () => {
  const all = JSON.parse(readFileSync(file, "utf8")) as Record<string, Record<string, string>>;
  // Provider keys only; the per-account `<provider>:<id>` keys are covered in source-keys.test.ts.
  return Object.fromEntries(Object.entries(all).map(([u, m]) => [u, Object.fromEntries(Object.entries(m).filter(([k]) => !k.includes(":")))]));
};

describe("writeTokenFile", () => {
  it("writes {user: {source: token}} with mode 600", () => {
    t.store.create({ ...base, owner: "ann", kind: "pat", secret: "ghp_ann" });
    t.store.create({ ...base, owner: "ann", provider: "drive", kind: "pat", secret: "drv_ann" });
    t.store.create({ ...base, owner: "bob", kind: "pat", secret: "ghp_bob" });
    expect(writeTokenFile(t.store, file)).toEqual({ users: 2, tokens: 3 });
    expect(read()).toEqual({ "t1:ann": { github: "ghp_ann", drive: "drv_ann" }, "t1:bob": { github: "ghp_bob" } });
    expect(statSync(file).mode & 0o777).toBe(0o600);
  });
  it("tightens an existing world-readable file", () => {
    writeFileSync(file, "{}", { mode: 0o644 });
    t.store.create({ ...base, owner: "ann", kind: "pat", secret: "x" });
    writeTokenFile(t.store, file);
    expect(statSync(file).mode & 0o777).toBe(0o600);
  });
  it("uses the access token of an oauth account", () => {
    t.store.create({ ...base, owner: "ann", kind: "oauth", secret: JSON.stringify({ accessToken: "gho_abc", refreshToken: "r" }) });
    writeTokenFile(t.store, file);
    expect(read()).toEqual({ "t1:ann": { github: "gho_abc" } });
  });
  it("keeps the oldest active account per provider and skips needs-auth ones", () => {
    const first = t.store.create({ ...base, owner: "ann", kind: "pat", secret: "old" });
    t.store.create({ ...base, owner: "ann", kind: "pat", secret: "newer" });
    t.store.setStatus(first.id, "needs-auth");
    writeTokenFile(t.store, file);
    expect(read()).toEqual({ "t1:ann": { github: "newer" } });
  });
  it("writes an empty map with no accounts and gives a company account token only to its owner", () => {
    expect(writeTokenFile(t.store, file)).toEqual({ users: 0, tokens: 0 });
    expect(read()).toEqual({});
    t.store.create({ ...base, owner: "root", access: "company", kind: "pat", secret: "ghp_root" });
    writeTokenFile(t.store, file);
    expect(read()).toEqual({ "t1:root": { github: "ghp_root" } });
  });
  it("skips an oauth account with no usable token and counts only what it wrote", () => {
    t.store.create({ ...base, owner: "ann", kind: "oauth", secret: "not json" });
    t.store.create({ ...base, owner: "ann", provider: "drive", kind: "pat", secret: "drv" });
    expect(writeTokenFile(t.store, file)).toEqual({ users: 1, tokens: 1 });
    expect(read()).toEqual({ "t1:ann": { drive: "drv" } });
  });
  it("leaves mode 600 even when the temporary file already exists as 644", () => {
    writeFileSync(`${file}.${process.pid}.tmp`, "x", { mode: 0o644 });
    t.store.create({ ...base, owner: "ann", kind: "pat", secret: "x" });
    writeTokenFile(t.store, file);
    expect(statSync(file).mode & 0o777).toBe(0o600);
  });
});
