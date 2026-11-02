import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { checkFanout } from "../../src/checks/fanout.ts";
import { cleanFixtures, fixture } from "../support/fixture.ts";

afterEach(cleanFixtures);

const dirs = ["src/a", "tests/unit", "bin", "scripts"];

describe("folder fanout rule", () => {
  it("accepts a README plus four files in each independently counted folder", () => {
    const files = Object.fromEntries(dirs.flatMap((dir) => Array.from({ length: 4 }, (_, index) => [`pkg/${dir}/${index}.${index === 3 ? "mjs" : "ts"}`, ""])));
    const readmes = Object.fromEntries(dirs.map((dir) => [`pkg/${dir}/README.md`, ""]));
    const root = fixture({ ...files, ...readmes, "pkg/src/a/child/code.ts": "" });
    expect(checkFanout(root, [join(root, "pkg")])).toEqual([]);
  });

  it("counts the README: five files plus a README is six and fails", () => {
    const files = Object.fromEntries(Array.from({ length: 5 }, (_, index) => [`pkg/src/${index}.ts`, ""]));
    const root = fixture({ ...files, "pkg/src/README.md": "" });
    expect(checkFanout(root, [join(root, "pkg")])).toEqual([{ file: "pkg/src", rule: "fanout", message: "6 files exceeds 5" }]);
  });

  it("reports six files but does not count nested files in the parent", () => {
    const files = Object.fromEntries(Array.from({ length: 6 }, (_, index) => [`pkg/src/nested/${index}.ts`, ""]));
    const root = fixture({ ...files, "pkg/src/only.ts": "" });
    const found = checkFanout(root, [join(root, "pkg")]);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ rule: "fanout", message: "6 files exceeds 5" });
  });

  it("checks bin and scripts folders", () => {
    const files = Object.fromEntries(["bin", "scripts"].flatMap((dir) => Array.from({ length: 6 }, (_, index) => [`pkg/${dir}/${index}.mjs`, ""])));
    const root = fixture(files);
    expect(checkFanout(root, [join(root, "pkg")]).map((item) => item.file)).toEqual(["pkg/bin", "pkg/scripts"]);
  });

  it("counts every file, including non-code files", () => {
    const files = Object.fromEntries(["a.json", "b.txt", "c.ts", "d.md", "e", ".f"].map((name) => [`pkg/tests/unit/${name}`, ""]));
    const root = fixture(files);
    expect(checkFanout(root, [join(root, "pkg")])).toHaveLength(1);
  });
});
