import { existsSync } from "node:fs";
import { join } from "node:path";
import { codeFiles, displayPath, type Violation } from "../fs/walk.ts";

const isTestFile = (path: string): boolean => /\.(test|spec)\.(ts|mjs|cjs)$/.test(path);
const stray = "test file must live in the tests/ folder beside src";
const empty = "src has code but tests/ holds no .test file";

/** Tests live in the package's tests/ folder beside src/; test files anywhere else are violations. */
export const checkTestsBeside = (root: string, packages: readonly string[]): Violation[] =>
  packages.flatMap((packageDir) => {
    const found = (path: string, message: string): Violation => ({ file: displayPath(root, path), rule: "tests-beside", message });
    const misplaced = codeFiles(packageDir, ["src", "bin", "scripts"]).filter(isTestFile);
    const hasSource = codeFiles(packageDir, ["src"]).length > 0;
    const hasTests = codeFiles(packageDir, ["tests"]).some(isTestFile);
    const tests = join(packageDir, "tests");
    return [...misplaced.map((file) => found(file, stray)), ...(hasSource && existsSync(tests) && !hasTests ? [found(tests, empty)] : [])];
  });
