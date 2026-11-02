import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { recheckFromEnv } from "../../src/cli/recheck.js";

const dir = mkdtempSync(join(tmpdir(), "brain-recheck-"));
const file = join(dir, "tokens.json");
writeFileSync(file, JSON.stringify({ "t1:ada": { github: "t" } }), { mode: 0o600 });
const env = { BRAIN_CONNECTOR: "github", GITHUB_TOKEN: "x", BRAIN_GITHUB_REPO: "o/r", BRAIN_USER_TOKENS_FILE: file };

afterEach(() => vi.unstubAllGlobals());

describe("recheckFromEnv", () => {
  it("reads the token under the caller's tenant and user, and not another tenant's", async () => {
    const seen: string[] = [];
    vi.stubGlobal("fetch", async (_u: unknown, init?: RequestInit) => {
      seen.push(new Headers(init?.headers).get("authorization") ?? "");
      return new Response("{}", { status: 200 });
    });
    const check = recheckFromEnv(env);
    const doc = { source: "github", address: "o/r/a.md" } as never;
    expect(await check?.(doc, { user: "ada", tenant: "t2" })).toBe(false);
    expect(seen).toEqual([]);
    await check?.(doc, { user: "ada", tenant: "t1" });
    expect(seen).toEqual(["token t"]);
  });
  it("is off without a tokens file", () => {
    expect(recheckFromEnv({ ...env, BRAIN_USER_TOKENS_FILE: undefined })).toBeUndefined();
  });
  it("denies a user with no token for the source", async () => {
    const check = recheckFromEnv(env);
    expect(await check?.({ source: "github", address: "o/r/a.md" } as never, { user: "bob", tenant: "t" })).toBe(false);
  });
  it("rejects a missing tokens file", () => {
    expect(() => recheckFromEnv({ ...env, BRAIN_USER_TOKENS_FILE: join(dir, "none.json") })).toThrow();
  });
  it("refuses a tokens file that others can read", () => {
    const open = join(dir, "open.json");
    writeFileSync(open, "{}");
    chmodSync(open, 0o644);
    expect(() => recheckFromEnv({ ...env, BRAIN_USER_TOKENS_FILE: open })).toThrow(/chmod 600/);
  });
  it("refuses a tokens file with the wrong shape", () => {
    const bad = join(dir, "bad.json");
    writeFileSync(bad, JSON.stringify({ ada: "t" }), { mode: 0o600 });
    expect(() => recheckFromEnv({ ...env, BRAIN_USER_TOKENS_FILE: bad })).toThrow(/must be/);
  });
});
