import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { checkLines } from "../../src/checks/lines.ts";
import { cleanFixtures, fixture } from "../support/fixture.ts";

afterEach(cleanFixtures);

describe("line rule", () => {
  it("accepts exactly 80 CRLF lines including unicode", () => {
    const root = fixture({
      "pkg/src/exact.ts": Array(80).fill("文").join("\r\n"),
      "pkg/src/trailing.ts": `${Array(80).fill("x").join("\n")}\n`,
    });
    expect(checkLines(root, [join(root, "pkg")])).toEqual([]);
  });

  it("reports source and test files over 80 lines", () => {
    const body = Array(81).fill("x").join("\n");
    const root = fixture({ "pkg/src/huge.ts": body, "pkg/tests/unit/big.mjs": body });
    const found = checkLines(root, [join(root, "pkg")]);
    expect(found).toHaveLength(2);
    expect(found.every((item) => item.rule === "lines")).toBe(true);
    expect(found[0]?.message).toContain("81 lines exceeds 80");
  });

  it("also checks bin and scripts files, including .cjs", () => {
    const body = Array(81).fill("x").join("\n");
    const root = fixture({ "pkg/bin/cli.mjs": body, "pkg/scripts/run.cjs": body });
    expect(checkLines(root, [join(root, "pkg")]).map((item) => item.file)).toEqual(["pkg/bin/cli.mjs", "pkg/scripts/run.cjs"]);
  });

  it("checks browser assets (.js, .css, .html) but not data (.json)", () => {
    const body = Array(81).fill("x").join("\n");
    const files = { "pkg/src/ui/a.js": body, "pkg/src/ui/b.css": body, "pkg/src/ui/c.html": body, "pkg/src/ui/d.json": body };
    const root = fixture(files);
    expect(checkLines(root, [join(root, "pkg")]).map((item) => item.file)).toEqual(["pkg/src/ui/a.js", "pkg/src/ui/b.css", "pkg/src/ui/c.html"]);
  });

  it("ignores non-source extensions and empty files", () => {
    const huge = Array(1000).fill("x").join("\n");
    const root = fixture({ "pkg/src/notes.md": huge, "pkg/src/empty.ts": "" });
    expect(checkLines(root, [join(root, "pkg")])).toEqual([]);
  });
});
