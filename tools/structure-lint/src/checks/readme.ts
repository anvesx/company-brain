import { existsSync } from "node:fs";
import { join } from "node:path";
import { dataOnly, displayPath, lintDirectories, type Violation } from "../fs/walk.ts";

/** Every folder under src, tests, bin and scripts needs a README.md, except data-only (.json) folders. */
export const checkReadmes = (root: string, packages: readonly string[]): Violation[] =>
  packages.flatMap((packageDir) =>
    lintDirectories(packageDir).flatMap((dir) => {
      const path = join(dir, "README.md");
      if (existsSync(path) || dataOnly(dir)) return [];
      return [{ file: displayPath(root, path), rule: "readme", message: "folder README.md is missing" }];
    }),
  );
