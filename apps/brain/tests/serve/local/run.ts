import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "vitest";

export const BIN = fileURLToPath(new URL("../../../dist/bin.js", import.meta.url));
const SECRET = "bin-test-secret-".padEnd(40, "0"); // low-entropy on purpose: a literal here trips the secret scanner

/** The newest source file under `dir` (path and mtime), found by walking every folder. */
function newest(dir: string): { file: string; mtime: number } {
  let best = { file: "", mtime: 0 };
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    const found = entry.isDirectory() ? newest(path) : { file: path, mtime: statSync(path).mtimeMs };
    if (found.mtime > best.mtime) best = found;
  }
  return best;
}

/**
 * Why the built binary cannot be trusted, or undefined when it can. These tests run dist/bin.js, not src/, so a stale
 * dist would pass or fail for the old code and hide a regression. Nothing here builds: the message says what to run.
 */
export function staleReason(bin: string, srcDir: string): string | undefined {
  let built: number;
  try {
    built = statSync(bin).mtimeMs;
  } catch {
    return `${bin} is missing: run pnpm --filter @anvesx/brain-app build`;
  }
  const { file, mtime } = newest(srcDir);
  const root = join(srcDir, "..");
  return mtime > built ? `dist/bin.js is older than ${relative(root, file)}: run pnpm --filter @anvesx/brain-app build` : undefined;
}

/** Runs the real binary. `dir` is a fresh folder for the two database files. */
export function run(env: Record<string, string>, args: string[] = [], prepare?: (dir: string) => void) {
  const stale = staleReason(BIN, fileURLToPath(new URL("../../../src", import.meta.url)));
  if (stale) throw new Error(stale);
  const dir = mkdtempSync(join(tmpdir(), "brain-bin-"));
  prepare?.(dir); // a bad file or folder the operator might leave behind
  const before = readdirSync(dir).sort();
  const base = { PATH: process.env.PATH ?? "", BRAIN_GRAPH_PATH: join(dir, "g.db"), BRAIN_AUTH_DB: join(dir, "a.db"), BRAIN_AUTH_SECRET: SECRET };
  const r = spawnSync(process.execPath, [BIN, ...args], { env: { ...base, ...env }, encoding: "utf8", timeout: 20_000 });
  return { dir, before, after: readdirSync(dir).sort(), code: r.status, out: r.stdout, err: r.stderr };
}
/** One `brain: ...` line and nothing else: no stack frames. */
export const oneLine = (err: string) => {
  expect(err.trim().split("\n")).toHaveLength(1);
  expect(err).not.toMatch(/\n\s+at |Error:/);
};
