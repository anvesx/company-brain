import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { checkLayout } from "../../src/layout.ts";
import { cleanFixtures, fixture } from "../support/fixture.ts";

afterEach(cleanFixtures);

describe("package layout rule", () => {
  it("accepts the required package paths", () => {
    const root = fixture({ "pkg/README.md": "# pkg", "pkg/src/README.md": "# src", "pkg/tests/.keep": "" });
    expect(checkLayout(root, [join(root, "pkg")])).toEqual([]);
  });

  it("reports every missing package path", () => {
    const root = fixture({ "pkg/src/nested/code.ts": "" });
    const found = checkLayout(root, [join(root, "pkg")]);
    expect(found.map((item) => item.message)).toEqual(["package README.md is missing", "package tests directory is missing"]);
    expect(found.every((item) => item.rule === "layout")).toBe(true);
  });

  it("reports a missing source directory once", () => {
    const root = fixture({ "pkg/README.md": "", "pkg/tests/.keep": "" });
    expect(checkLayout(root, [join(root, "pkg")])).toEqual([
      {
        file: "pkg/src",
        rule: "layout",
        message: "package src directory is missing",
      },
    ]);
  });
});
