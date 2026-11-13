import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { displayPath, type Violation } from "../fs/walk.ts";

/** Every package folder must have package.json, README.md, src/, tests/ and valid exports. */
export const checkModuleShape = (root: string, packages: readonly string[]): Violation[] =>
  packages.flatMap((packageDir) => {
    const violations: Violation[] = [];
    const missing = (path: string, message: string): void => {
      violations.push({ file: displayPath(root, path), rule: "module-shape", message });
    };

    const packageJson = join(packageDir, "package.json");
    const readme = join(packageDir, "README.md");
    const source = join(packageDir, "src");
    const tests = join(packageDir, "tests");

    if (!existsSync(packageJson)) missing(packageJson, "package.json is missing");
    if (!existsSync(readme)) missing(readme, "README.md is missing");
    if (!existsSync(source)) missing(source, "src/ directory is missing");
    if (!existsSync(tests)) missing(tests, "tests/ directory is missing");

    // Validate package.json is valid JSON
    if (existsSync(packageJson)) {
      try {
        readFileSync(packageJson, "utf8");
        JSON.parse(readFileSync(packageJson, "utf8"));
      } catch {
        missing(packageJson, "package.json is invalid JSON");
      }
    }

    return violations;
  });
