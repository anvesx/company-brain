import { execFileSync, spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const pkg = join(import.meta.dirname, "..", "..");
const out = join(pkg, "node_modules", ".cache", `bin-test-${process.pid}-${Date.now()}`);
const bin = join(out, "bin.js");
beforeAll(() => {
  execFileSync("pnpm", ["exec", "tsc", "-p", "tsconfig.build.json", "--outDir", out, "--declaration", "false"], { cwd: pkg, stdio: "pipe" });
}, 120_000);
afterAll(() => rmSync(out, { recursive: true, force: true }));
const good = (dir: string) => ({
  PATH: process.env.PATH ?? "",
  CONNECTIONS_KEY: "ab".repeat(32),
  CONNECTIONS_AUTH_SECRET: "s".repeat(32),
  CONNECTIONS_DB_PATH: join(dir, "c.db"),
  CONNECTIONS_GRAPH_PATH: join(dir, "g.db"),
  CONNECTIONS_PORT: "0",
});

describe("dist/bin.js", () => {
  it("exits 1 and names every bad setting when the config is bad", () => {
    const r = spawnSync("node", [bin], { env: { PATH: process.env.PATH ?? "" }, encoding: "utf8" });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/CONNECTIONS_KEY.*CONNECTIONS_AUTH_SECRET.*CONNECTIONS_DB_PATH.*CONNECTIONS_GRAPH_PATH/);
  });
  it("starts, answers 401 without a token, and exits 0 on SIGTERM", async () => {
    const dir = mkdtempSync(join(tmpdir(), "conn-bin-run-"));
    const child = spawn("node", [bin], { env: good(dir) });
    const line = await new Promise<string>((ok, no) => {
      child.stdout.once("data", (d) => ok(String(d)));
      child.once("exit", () => no(new Error("exited early")));
    });
    const port = /127\.0\.0\.1:(\d+)/.exec(line)?.[1];
    expect((await fetch(`http://127.0.0.1:${port}/v1/accounts`)).status).toBe(401);
    const code = new Promise((ok) => child.once("exit", ok));
    child.kill("SIGTERM");
    expect(await code).toBe(0);
    rmSync(dir, { recursive: true, force: true });
  }, 30_000);
});
