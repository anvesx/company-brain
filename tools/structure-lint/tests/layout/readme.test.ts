import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { checkReadmes } from "../../src/checks/readme.ts";
import { cleanFixtures, fixture } from "../support/fixture.ts";

afterEach(cleanFixtures);
const run = (files: Record<string, string>) => {
  const root = fixture(files);
  return checkReadmes(root, [join(root, "pkg")]);
};

describe("folder README rule", () => {
  it("accepts a README in every src, tests, bin and scripts folder, nested included", () => {
    const dirs = ["src", "src/nested", "tests", "tests/unit", "bin", "scripts"];
    const files = Object.fromEntries(
      dirs.flatMap((dir) => [
        [`pkg/${dir}/README.md`, "# x"],
        [`pkg/${dir}/a.ts`, ""],
      ]),
    );
    expect(run(files)).toEqual([]);
  });

  it("reports every code folder without a README, including bin, scripts and tests", () => {
    const found = run({ "pkg/src/a.ts": "", "pkg/src/n/b.ts": "", "pkg/tests/u/c.ts": "", "pkg/bin/d.mjs": "", "pkg/scripts/e.cjs": "" });
    expect(found.map((item) => item.file).sort()).toEqual([
      "pkg/bin/README.md",
      "pkg/scripts/README.md",
      "pkg/src/README.md",
      "pkg/src/n/README.md",
      "pkg/tests/README.md",
      "pkg/tests/u/README.md",
    ]);
    expect(found.every((item) => item.rule === "readme" && item.message === "folder README.md is missing")).toBe(true);
  });

  it("exempts only data-only folders of json files", () => {
    const base = { "pkg/src/README.md": "", "pkg/tests/README.md": "", "pkg/tests/data/README.md": "" };
    expect(run({ ...base, "pkg/tests/data/fixtures/a.json": "{}", "pkg/tests/data/fixtures/b.json": "{}" })).toEqual([]);
    expect(run({ ...base, "pkg/tests/data/fixtures/a.json": "{}", "pkg/tests/data/fixtures/b.ts": "" })).toHaveLength(1);
    expect(run({ ...base, "pkg/tests/data/fixtures/a.json": "{}", "pkg/tests/data/fixtures/b.txt": "" })).toHaveLength(1);
  });
});
