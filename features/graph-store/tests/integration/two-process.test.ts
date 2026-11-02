import { execFile, execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { promisify } from "node:util";
import { beforeAll, describe, expect, it } from "vitest";
import { openStore, tmpDir } from "../support/helpers.js";

const run = promisify(execFile);
const root = join(import.meta.dirname, "..", "..");
let entry = "";

describe("two OS processes writing one file", () => {
  beforeAll(() => {
    const out = join(tmpDir(), "dist");
    const tsc = createRequire(import.meta.url).resolve("typescript/bin/tsc");
    // Emit only (the typecheck gate covers types): works from a Stryker sandbox, where tsconfig.base.json is not reachable.
    const files = readdirSync(join(root, "src")).filter((f) => f.endsWith(".ts"));
    const flags = [
      "--outDir",
      out,
      "--rootDir",
      join(root, "src"),
      "--target",
      "ES2023",
      "--module",
      "NodeNext",
      "--moduleResolution",
      "NodeNext",
      "--noCheck",
      "--skipLibCheck",
    ];
    execFileSync(process.execPath, [tsc, ...flags, ...files.map((f) => join(root, "src", f))], { cwd: root });
    entry = join(out, "index.js");
  }, 60_000);

  it("loses no write and keeps one current row per id", async () => {
    const db = join(tmpDir(), "shared.db");
    const worker = join(import.meta.dirname, "writer.mjs");
    const N = 150;
    await Promise.all(["a", "b"].map((p) => run(process.execPath, [worker, entry, db, p, String(N)])));
    const s = openStore(db);
    for (const p of ["a", "b"]) for (let i = 0; i < N; i++) expect(s.node("t1", `${p}-${i}`)?.title).toBe("own");
    expect(s.neighbors("t1", "shared", { dir: "in" })).toHaveLength(2 * N);
    expect(s.neighbors("t1", "hub", { dir: "out" })).toHaveLength(N);
    for (let i = 0; i < N; i++) {
      const rows = s.history("t1", `shared-${i}`);
      expect(rows.length).toBeGreaterThanOrEqual(1);
      expect(rows.length).toBeLessThanOrEqual(2);
      expect(["a", "b"]).toContain(s.node("t1", `shared-${i}`)?.title);
    }
  }, 60_000);
});
