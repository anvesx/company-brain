import { displayPath, filesIn, lintDirectories, type Violation } from "../fs/walk.ts";

/** A folder holds at most five files, the README included. */
export const checkFanout = (root: string, packages: readonly string[]): Violation[] =>
  packages.flatMap((packageDir) =>
    lintDirectories(packageDir).flatMap((dir) => {
      const count = filesIn(dir).length;
      return count > 5 ? [{ file: displayPath(root, dir), rule: "fanout", message: `${count} files exceeds 5` }] : [];
    }),
  );
