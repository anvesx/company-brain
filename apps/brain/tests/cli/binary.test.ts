import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { signedPrincipalFor } from "../../src/auth/token.js";

const bin = resolve(import.meta.dirname, "../../dist/bin.js");
const dir = mkdtempSync(join(tmpdir(), "brain-bin-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));
const secret = "b".repeat(32);
const run = (args: string[], env: Record<string, string>) =>
  spawnSync("node", [bin, ...args], { env: { PATH: process.env.PATH ?? "", ...env }, encoding: "utf8", timeout: 15_000 });

// These run the built binary; `pnpm -r build` (part of the gate) produces it.
describe.skipIf(!existsSync(bin))("the built binary", () => {
  it("exits 1 with a message, not a stack trace, for BRAIN_DATA_DIR without BRAIN_AUTH_SECRET", () => {
    const r = run([], { BRAIN_DEMO: "1", BRAIN_DATA_DIR: join(dir, "d") });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("BRAIN_AUTH_SECRET is required when BRAIN_DATA_DIR is set");
    expect(r.stderr).not.toContain("    at ");
  });
  it("refuses unsigned tokens on a non-loopback host", () => {
    const r = run([], { BRAIN_DEMO: "1", BRAIN_HOST: "0.0.0.0", BRAIN_PORT: "0" });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("BRAIN_AUTH_SECRET");
  });
  it.each([
    [{ BRAIN_CONNECTOR: "github" }, "BRAIN_CONNECTOR=github needs GITHUB_TOKEN, BRAIN_GITHUB_REPO (owner/repo)"],
    [{ BRAIN_CONNECTOR: "drive" }, "BRAIN_CONNECTOR=drive needs DRIVE_ACCESS_TOKEN"],
    [{ BRAIN_CONNECTOR: "folder" }, "BRAIN_CONNECTOR=folder needs BRAIN_FOLDER_ROOT"],
  ])("exits 1 with a clear message, not a stack trace, for %j", (connector, message) => {
    const r = run([], { ...connector, BRAIN_TENANT: "acme", BRAIN_AUTH_SECRET: secret, BRAIN_AUDIT_KEY: secret, BRAIN_PORT: "0" });
    expect(r.status).toBe(1);
    expect(r.stderr.trim()).toBe(`brain: ${message}`);
  });
  it("mint-token prints a token the server's verifier accepts", () => {
    const r = run(["mint-token", "--user", "alice", "--tenant", "acme", "--groups", "eng"], { BRAIN_AUTH_SECRET: secret });
    expect(r.status).toBe(0);
    const header = { requestInfo: { headers: { authorization: `Bearer ${r.stdout.trim()}` } } };
    expect(signedPrincipalFor(secret)(header)).toEqual({ id: "alice", tenantId: "acme", groups: ["eng"] });
  });
  it("serves, answers /readyz, and exits 0 on SIGTERM", async () => {
    const env = {
      PATH: process.env.PATH ?? "",
      BRAIN_DEMO: "1",
      BRAIN_PORT: "0",
      BRAIN_HEALTH_PORT: "0",
      BRAIN_AUDIT_DB: join(dir, "a.db"),
      BRAIN_ANCHOR: join(dir, "a.log"),
    };
    const child = spawn("node", [bin], { env });
    let out = "";
    child.stdout.on("data", (c: Buffer) => {
      out += c.toString();
    });
    const exited = new Promise<number | null>((r) => child.once("exit", (code) => r(code)));
    const health = await new Promise<string>((ok, fail) => {
      const timer = setTimeout(() => fail(new Error(`no health url in 10s: ${out}`)), 10_000);
      child.stdout.on("data", () => {
        const url = /health on (http:\/\/\S+)/.exec(out)?.[1];
        if (!url) return;
        clearTimeout(timer);
        ok(url);
      });
    });
    expect((await fetch(`${health}/readyz`)).status).toBe(200);
    child.kill("SIGTERM");
    expect(await exited).toBe(0);
  }, 20_000);
});
