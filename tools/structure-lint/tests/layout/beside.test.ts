import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { checkTestsBeside } from "../../src/checks/beside.ts";
import { cleanFixtures, fixture } from "../support/fixture.ts";

afterEach(cleanFixtures);
const run = (files: Record<string, string>) => {
  const root = fixture(files);
  return checkTestsBeside(root, [join(root, "pkg")]);
};

describe("tests beside src rule", () => {
  it("accepts a tests folder next to src holding test files", () => {
    expect(run({ "pkg/src/a.ts": "", "pkg/tests/unit/a.test.ts": "", "pkg/tests/it/b.test.mjs": "" })).toEqual([]);
  });

  it("reports src code with no test file in the tests folder beside it", () => {
    const found = run({ "pkg/src/a.ts": "", "pkg/tests/README.md": "", "pkg/tests/support/helper.ts": "" });
    expect(found).toEqual([{ file: "pkg/tests", rule: "tests-beside", message: "src has code but tests/ holds no .test file" }]);
  });

  it("does not demand tests for a package without src code", () => {
    expect(run({ "pkg/src/README.md": "", "pkg/tests/README.md": "" })).toEqual([]);
  });

  it("reports test files that live outside a tests folder", () => {
    const found = run({ "pkg/src/a.ts": "", "pkg/src/a.test.ts": "", "pkg/src/n/b.spec.ts": "", "pkg/bin/c.test.mjs": "", "pkg/tests/x.test.ts": "" });
    expect(found.map((item) => item.file).sort()).toEqual(["pkg/bin/c.test.mjs", "pkg/src/a.test.ts", "pkg/src/n/b.spec.ts"]);
    expect(found.every((item) => item.message === "test file must live in the tests/ folder beside src")).toBe(true);
  });

  it("stays silent when the tests folder is missing (layout reports that)", () => {
    expect(run({ "pkg/src/a.ts": "" })).toEqual([]);
  });
});
