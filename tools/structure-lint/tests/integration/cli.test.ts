import { execFile, spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import { cleanFixtures, fixture, packageJson } from "../support/fixture.ts";

afterEach(cleanFixtures);
const cli = resolve("bin/cli.mjs");
const run = (root: string) => spawnSync(process.execPath, [cli, "--root", root], { encoding: "utf8" });
const runAsync = promisify(execFile);
const base = (name: string) => ({
  [`features/${name}/package.json`]: packageJson(`@anvesx/${name}`),
  [`features/${name}/README.md`]: "# package",
  [`features/${name}/src/README.md`]: "# source",
  [`features/${name}/tests/README.md`]: "# tests",
  [`features/${name}/tests/a.test.ts`]: "",
});

describe("structure-lint CLI", () => {
  it("prints all six rule violations and exits one", () => {
    const crowded = Object.fromEntries(Array.from({ length: 6 }, (_, index) => [`features/two/src/many/${index}.ts`, ""]));
    const root = fixture({
      ...base("core-types"),
      ...base("one"),
      ...base("two"),
      ...crowded,
      "features/one/src/long.ts": Array(81).fill("x").join("\n"),
      "features/one/src/missing/code.ts": "",
      "features/one/src/stray.test.ts": "",
      "features/five/package.json": packageJson("@anvesx/five"),
      "features/five/src/README.md": "# source",
      "features/two/src/many/README.md": "# source",
      "features/two/package.json": packageJson("@anvesx/two", { "@anvesx/one": "workspace:*" }),
    });
    const result = run(root);
    expect(result.status).toBe(1);
    for (const rule of ["lines", "fanout", "layout", "tiers", "readme", "tests-beside"]) expect(result.stdout).toContain(`:${rule}:`);
    expect(result.stdout).toMatch(/checked 4 packages, \d+ files, \d+ folders/);
  });

  it("prints exact denominators: every file and folder under src, tests, bin, scripts", () => {
    const root = fixture({ ...base("core-types"), "features/core-types/bin/README.md": "# bin", "features/core-types/bin/c.mjs": "" });
    const result = run(root);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("checked 1 packages, 5 files, 3 folders");
  });

  it("exits two when no packages exist", () => {
    const result = run(fixture({ "README.md": "empty" }));
    expect(result.status).toBe(2);
    expect(result.stdout).toContain("checked 0 packages, 0 files, 0 folders");
  });

  it("runs concurrently on a valid fixture and on the real repository", async () => {
    const root = fixture(base("core-types"));
    const outputs = await Promise.all([root, root].map((path) => runAsync(process.execPath, [cli, "--root", path], { encoding: "utf8" })));
    expect(outputs.every(({ stdout }) => stdout.includes("checked 1 packages"))).toBe(true);
    const real = run(resolve("../.."));
    expect(real.status).toBe(0);
    expect(real.stdout).toMatch(/checked \d+ packages, \d+ files/);
  });
});
