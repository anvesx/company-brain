import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { codeFiles, dataOnly, displayPath, findPackages, lintDirectories, StructureLintError } from "../../src/fs/walk.ts";
import { cleanFixtures, fixture } from "../support/fixture.ts";

afterEach(cleanFixtures);

describe("repository walking", () => {
  it("discovers package directories and tiers only", () => {
    const root = fixture({
      "features/f/package.json": "{}",
      "services/s/package.json": "{}",
      "modules/m/package.json": "{}",
      "apps/a/package.json": "{}",
      "tools/t/package.json": "{}",
      "features/no-package/file.ts": "",
      "features/file": "",
    });
    expect(findPackages(root).map(({ tier }) => tier)).toEqual(["feature", "service", "module", "app", "tool"]);
    expect(findPackages(join(root, "absent"))).toEqual([]);
  });

  it("returns code files, lint directories, display paths, and typed errors", () => {
    const root = fixture({
      "pkg/src/a.ts": "",
      "pkg/src/nested/b.mjs": "",
      "pkg/src/README.md": "",
      "pkg/tests/unit/c.ts": "",
    });
    expect(codeFiles(join(root, "pkg"))).toHaveLength(3);
    expect(lintDirectories(join(root, "pkg"))).toHaveLength(4);
    expect(displayPath(root, root)).toBe(".");
    expect(new StructureLintError("bad").name).toBe("StructureLintError");
  });

  it("walks bin and scripts as code folders and reads .cjs files", () => {
    const root = fixture({ "pkg/bin/cli.mjs": "", "pkg/scripts/run.cjs": "", "pkg/scripts/data.txt": "", "pkg/docs/x.ts": "" });
    const pkg = join(root, "pkg");
    expect(
      codeFiles(pkg)
        .map((file) => displayPath(pkg, file))
        .sort(),
    ).toEqual(["bin/cli.mjs", "scripts/run.cjs"]);
    expect(
      lintDirectories(pkg)
        .map((dir) => displayPath(pkg, dir))
        .sort(),
    ).toEqual(["bin", "scripts"]);
  });

  it("treats only folders made purely of json files as data-only", () => {
    const root = fixture({ "a/1.json": "", "a/2.json": "", "b/1.json": "", "b/x.ts": "", "c/README.md": "", "d/1.json": "", "d/n.txt": "" });
    const flags = ["a", "b", "c", "d", "missing"].map((name) => dataOnly(join(root, name)));
    expect(flags).toEqual([true, false, false, false, false]);
  });
});
