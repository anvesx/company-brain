import { existsSync, readdirSync } from "node:fs";
import { extname, join, relative } from "node:path";

export type Tier = "feature" | "service" | "module" | "app" | "tool";
export type Violation = { file: string; rule: string; message: string };
export type PackageInfo = { dir: string; tier: Tier };

const tierFolders: ReadonlyArray<readonly [string, Tier]> = [
  ["features", "feature"],
  ["services", "service"],
  ["modules", "module"],
  ["apps", "app"],
  ["tools", "tool"],
];

export class StructureLintError extends Error {
  override readonly name = "StructureLintError";
}

export const findPackages = (root: string): PackageInfo[] =>
  tierFolders.flatMap(([folder, tier]) => {
    const parent = join(root, folder);
    if (!existsSync(parent)) return [];
    return readdirSync(parent, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(join(parent, entry.name, "package.json")))
      .map((entry) => ({ dir: join(parent, entry.name), tier }));
  });

export const walkDirectories = (root: string): string[] => {
  if (!existsSync(root)) return [];
  const found = [root];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.isDirectory()) found.push(...walkDirectories(join(root, entry.name)));
  }
  return found;
};

/** Folders under a package whose contents are linted. Each is walked recursively. */
export const codeRoots = ["src", "tests", "bin", "scripts"] as const;
const codeExtensions = [".ts", ".mjs", ".cjs", ".js", ".css", ".html"];

export const lintDirectories = (packageDir: string): string[] => codeRoots.flatMap((folder) => walkDirectories(join(packageDir, folder)));

export const filesIn = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);

/** Code files (.ts, .mjs, .cjs, .js, .css, .html) under the given folders of a package, all of them by default. */
export const codeFiles = (packageDir: string, folders: readonly string[] = codeRoots): string[] =>
  folders
    .flatMap((folder) => walkDirectories(join(packageDir, folder)))
    .flatMap((dir) =>
      filesIn(dir)
        .filter((name) => codeExtensions.includes(extname(name)))
        .map((name) => join(dir, name)),
    );

/** Narrow README exemption: a folder whose every file is .json (fixtures) and holds at least one. */
export const dataOnly = (dir: string): boolean => {
  if (!existsSync(dir)) return false;
  const names = filesIn(dir);
  return names.length > 0 && names.every((name) => extname(name) === ".json");
};

export const displayPath = (root: string, path: string): string => relative(root, path) || ".";
