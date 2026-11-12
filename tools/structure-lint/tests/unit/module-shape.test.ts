import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { checkModuleShape } from "../../src/checks/module-shape.ts";
import { cleanFixtures, fixture, packageJson } from "../support/fixture.ts";

afterEach(cleanFixtures);

describe("module-shape rule", () => {
  it("accepts a properly shaped package", () => {
    const root = fixture({
      "pkg/package.json": packageJson("@anvesx/test"),
      "pkg/README.md": "# test",
      "pkg/src/index.ts": "export const test = 1;",
      "pkg/tests/unit/test.test.ts": "test('works', () => {});",
    });
    expect(checkModuleShape(root, [join(root, "pkg")])).toEqual([]);
  });

  it("reports missing package.json", () => {
    const root = fixture({
      "pkg/README.md": "# test",
      "pkg/src/index.ts": "export const test = 1;",
      "pkg/tests/unit/test.test.ts": "test('works', () => {});",
    });
    const found = checkModuleShape(root, [join(root, "pkg")]);
    expect(found).toHaveLength(1);
    expect(found[0]?.file).toBe("pkg/package.json");
    expect(found[0]?.message).toBe("package.json is missing");
  });

  it("reports missing README.md", () => {
    const root = fixture({
      "pkg/package.json": packageJson("@anvesx/test"),
      "pkg/src/index.ts": "export const test = 1;",
      "pkg/tests/unit/test.test.ts": "test('works', () => {});",
    });
    const found = checkModuleShape(root, [join(root, "pkg")]);
    expect(found).toHaveLength(1);
    expect(found[0]?.file).toBe("pkg/README.md");
    expect(found[0]?.message).toBe("README.md is missing");
  });

  it("reports missing src/ directory", () => {
    const root = fixture({
      "pkg/package.json": packageJson("@anvesx/test"),
      "pkg/README.md": "# test",
      "pkg/tests/unit/test.test.ts": "test('works', () => {});",
    });
    const found = checkModuleShape(root, [join(root, "pkg")]);
    expect(found).toHaveLength(1);
    expect(found[0]?.file).toBe("pkg/src");
    expect(found[0]?.message).toBe("src/ directory is missing");
  });

  it("reports missing tests/ directory", () => {
    const root = fixture({
      "pkg/package.json": packageJson("@anvesx/test"),
      "pkg/README.md": "# test",
      "pkg/src/index.ts": "export const test = 1;",
    });
    const found = checkModuleShape(root, [join(root, "pkg")]);
    expect(found).toHaveLength(1);
    expect(found[0]?.file).toBe("pkg/tests");
    expect(found[0]?.message).toBe("tests/ directory is missing");
  });

  it("reports invalid package.json JSON", () => {
    const root = fixture({
      "pkg/package.json": "{ invalid json }",
      "pkg/README.md": "# test",
      "pkg/src/index.ts": "export const test = 1;",
      "pkg/tests/unit/test.test.ts": "test('works', () => {});",
    });
    const found = checkModuleShape(root, [join(root, "pkg")]);
    expect(found).toHaveLength(1);
    expect(found[0]?.file).toBe("pkg/package.json");
    expect(found[0]?.message).toBe("package.json is invalid JSON");
  });
});
