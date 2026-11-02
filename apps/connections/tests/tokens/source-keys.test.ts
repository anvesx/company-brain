import { chmodSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { recheckFromEnv } from "../../../brain/src/cli/recheck.js";
import { sourceOf } from "../../src/sync/connector.js";
import { writeTokenFile } from "../../src/tokens/write-token-file.js";
import { tempStore } from "../accounts/fixture.js";

const base = { tenant: "t1", provider: "github", label: "a", access: "private", dataZone: "private", kind: "pat" } as const;
let t: ReturnType<typeof tempStore>;
let file: string;
beforeEach(() => {
  t = tempStore();
  file = join(t.path, "..", "tokens.json");
});
afterEach(() => t.done());
const read = () => JSON.parse(readFileSync(file, "utf8")) as Record<string, Record<string, string>>;

describe("token file keys", () => {
  it("holds one token per account under its graph source, besides the provider key", () => {
    const one = t.store.create({ ...base, owner: "ann", secret: "ghp_one" });
    const two = t.store.create({ ...base, owner: "ann", label: "b", secret: "ghp_two" });
    expect(writeTokenFile(t.store, file)).toEqual({ users: 1, tokens: 2 });
    expect(read()).toEqual({ ann: { github: "ghp_one", [sourceOf(one)]: "ghp_one", [sourceOf(two)]: "ghp_two" } });
  });
  it("leaves a needs-auth account out of both keys", () => {
    const one = t.store.create({ ...base, owner: "ann", secret: "ghp_one" });
    t.store.setStatus(one.id, "needs-auth");
    writeTokenFile(t.store, file);
    expect(read()).toEqual({});
  });
  it("loads through the brain's own recheckFromEnv, which enforces the same shape and mode rules", () => {
    t.store.create({ ...base, owner: "ann", secret: "ghp_one" });
    t.store.create({ ...base, owner: "bob", provider: "drive", secret: "drv" });
    writeTokenFile(t.store, file);
    const env = { BRAIN_USER_TOKENS_FILE: file, BRAIN_CONNECTOR: "folder", BRAIN_FOLDER_ROOT: t.path };
    expect(recheckFromEnv(env)).toBeTypeOf("function");
    chmodSync(file, 0o644);
    expect(() => recheckFromEnv(env)).toThrow(/chmod 600/);
  });
});
