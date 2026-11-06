import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { staleReason } from "./run.js";

/** A fake package: dist/bin.js stamped `bin` seconds, src/deep/a.ts stamped `src` seconds after the epoch. */
function pkg(bin: number, src: number) {
  const root = mkdtempSync(join(tmpdir(), "brain-fresh-"));
  mkdirSync(join(root, "dist"));
  mkdirSync(join(root, "src/deep"), { recursive: true });
  writeFileSync(join(root, "dist/bin.js"), "");
  writeFileSync(join(root, "src/deep/a.ts"), "");
  utimesSync(join(root, "dist/bin.js"), bin, bin);
  utimesSync(join(root, "src/deep/a.ts"), src, src);
  return root;
}

describe("the binary tests refuse a stale dist", () => {
  it("names the newer source file and the build command when dist/bin.js is older", () => {
    const root = pkg(1000, 2000);
    expect(staleReason(join(root, "dist/bin.js"), join(root, "src"))).toMatch(/older than src\/deep\/a\.ts.*pnpm --filter @anvesx\/brain-app build/);
  });

  it("says nothing when dist/bin.js is newer than every source file", () => {
    const root = pkg(3000, 2000);
    expect(staleReason(join(root, "dist/bin.js"), join(root, "src"))).toBeUndefined();
  });

  it("says the binary is missing when there is no dist/bin.js", () => {
    const root = pkg(3000, 2000);
    expect(staleReason(join(root, "dist/nope.js"), join(root, "src"))).toMatch(/missing/);
  });
});
