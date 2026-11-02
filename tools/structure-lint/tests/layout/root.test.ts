import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { checkRootFiles } from "../../src/layout.ts";
import { cleanFixtures, fixture } from "../support/fixture.ts";

afterEach(cleanFixtures);

const names = (count: number) => Object.fromEntries(Array.from({ length: count }, (_, index) => [`pkg/file${index}.json`, ""]));

describe("package root files rule", () => {
  it("accepts five files in the package root, the README counted", () => {
    const root = fixture({ ...names(4), "pkg/README.md": "" });
    expect(checkRootFiles(root, [join(root, "pkg")])).toEqual([]);
  });

  it("rejects six: config files count toward the limit like any other file", () => {
    const root = fixture({ ...names(5), "pkg/README.md": "" });
    expect(checkRootFiles(root, [join(root, "pkg")])).toEqual([{ file: "pkg", rule: "root-files", message: "6 root files exceeds 5" }]);
  });

  it("counts dotfiles and ignores folders", () => {
    const root = fixture({ ...names(4), "pkg/.hidden": "", "pkg/src/a.ts": "", "pkg/tests/b.ts": "" });
    expect(checkRootFiles(root, [join(root, "pkg")])).toHaveLength(0);
    const more = fixture({ ...names(5), "pkg/.hidden": "" });
    expect(checkRootFiles(more, [join(more, "pkg")])).toHaveLength(1);
  });

  it("checks each package on its own", () => {
    const root = fixture({
      ...names(1),
      "other/a.json": "",
      "other/b.json": "",
      "other/c.json": "",
      "other/d.json": "",
      "other/e.json": "",
      "other/f.json": "",
    });
    expect(checkRootFiles(root, [join(root, "pkg"), join(root, "other")]).map((item) => item.file)).toEqual(["other"]);
  });
});
