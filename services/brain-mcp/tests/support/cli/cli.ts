import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { track } from "../graph.js";

/** Absolute path of an agent CLI on PATH, or null when it is not installed. */
export function which(bin: string): string | null {
  const r = spawnSync("/usr/bin/which", [bin], { encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : null;
}

/**
 * Decides whether an agent-CLI test runs, and says why not out loud. A skipped test always prints its
 * reason, so a missing CLI can never pass silently. `pnpm e2e` sets BRAIN_E2E=1; plain `pnpm test` skips.
 */
export function gate(bin: string): { skip: boolean; path: string | null } {
  const path = which(bin);
  const reason = process.env["BRAIN_E2E"] !== "1" ? "BRAIN_E2E is not 1 (run pnpm e2e)" : path === null ? `${bin} is not on PATH` : null;
  if (reason) console.log(`SKIP ${bin} e2e: ${reason}`);
  return { skip: reason !== null, path };
}

/**
 * Runs a CLI with a bounded time and resolves with its exit status plus stdout and stderr together.
 * It is async on purpose: the brain server runs in this same process, so a blocking spawn would freeze it
 * and the CLI's own connection check to it would hang.
 */
export function run(
  bin: string,
  args: string[],
  opts: { cwd: string; env?: Record<string, string>; timeoutMs?: number },
): Promise<{ status: number | null; out: string }> {
  return new Promise((resolve) => {
    const child = spawn(bin, args, { cwd: opts.cwd, env: { ...process.env, ...opts.env }, timeout: opts.timeoutMs ?? 60_000 });
    let out = "";
    child.stdout.on("data", (d: Buffer) => (out += d.toString()));
    child.stderr.on("data", (d: Buffer) => (out += d.toString()));
    child.on("error", (e) => resolve({ status: null, out: `${out}${e.message}` }));
    child.on("close", (status) => resolve({ status, out }));
  });
}

/** A fresh empty folder under the OS temp dir: the CLI's config home or working directory for one test. */
export const scratch = (): string => track(mkdtempSync(join(tmpdir(), "brain-mcp-cli-")));

/** Writes a rendered install body to `path` inside `root`, creating folders on the way. */
export function place(root: string, path: string, body: string): string {
  const file = join(root, path.replace(/^~\//, ""));
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, body);
  return file;
}

/** A server name no real user config holds, so a listing cannot match an entry the test did not write. */
export const uniqueName = (): string => `company-brain-${process.pid}-${Date.now() % 100_000}`;
