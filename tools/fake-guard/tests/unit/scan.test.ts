import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { packageDirs, scanRepo } from "../../src/scan.ts";

let root: string;
const put = (rel: string, text = "") => {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), text);
};

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "guard-scan-"));
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

describe("packageDirs", () => {
  it("lists directories with a package.json in every tier and skips the rest", () => {
    for (const p of ["features/a", "services/b", "modules/c", "apps/d", "tools/e"]) put(`${p}/package.json`, "{}");
    put("features/no-manifest/readme.md");
    put("features/loose-file.txt");
    expect(packageDirs(root).sort()).toEqual(["apps/d", "features/a", "modules/c", "services/b", "tools/e"].map((p) => join(root, p)).sort());
  });
  it("returns nothing when no tier exists", () => {
    expect(packageDirs(root)).toEqual([]);
  });
});

describe("scanRepo", () => {
  it("scans src and tests of each package with repo-relative paths", () => {
    put("features/a/package.json", "{}");
    put("features/a/src/store.ts", "export const makeFakeStore = 1\n");
    put("features/a/src/deep/inner.mjs", "export const ok = 1\n");
    put("features/a/tests/unit/x.test.ts", `const a = 1\n${"vi"}.mock("x")\n`);
    const { findings, checked } = scanRepo(root);
    expect(checked).toBe(3);
    expect(findings).toEqual([
      { file: "features/a/src/store.ts", rule: "src-ships-fake", line: 1 },
      { file: "features/a/tests/unit/x.test.ts", rule: "mocks-own-code", line: 2 },
    ]);
  });
  it("ignores node_modules, dist, non-code files and other directories", () => {
    put("features/a/package.json", "{}");
    put("features/a/src/node_modules/m.ts", "export const fakeOne = 1");
    put("features/a/src/dist/d.ts", "export const fakeTwo = 1");
    put("features/a/src/notes.md", "export const fakeThree = 1");
    put("features/a/src/copy.ts.bak", "export const fakeFive = 1");
    put("features/a/src/ok.ts", "export const fine = 1");
    put("features/a/scripts/s.ts", "export const fakeFour = 1");
    expect(scanRepo(root)).toEqual({ findings: [], checked: 1 });
  });
  it("reports zero files for an empty repo", () => {
    expect(scanRepo(root)).toEqual({ findings: [], checked: 0 });
  });
});
