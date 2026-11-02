#!/usr/bin/env node
import { resolve } from "node:path";
import { checkTestsBeside } from "../src/checks/beside.ts";
import { checkFanout } from "../src/checks/fanout.ts";
import { checkLines } from "../src/checks/lines.ts";
import { checkReadmes } from "../src/checks/readme.ts";
import { filesIn, findPackages, lintDirectories, StructureLintError } from "../src/fs/walk.ts";
import { checkLayout } from "../src/layout.ts";
import { checkTiers } from "../src/tiers.ts";

const rootIndex = process.argv.indexOf("--root");
if (rootIndex >= 0 && process.argv[rootIndex + 1] === undefined) {
  console.error("usage: structure-lint [--root dir]");
  process.exit(2);
}
const root = resolve(rootIndex >= 0 ? process.argv[rootIndex + 1] : process.cwd());

try {
  const packages = findPackages(root);
  const dirs = packages.map(({ dir }) => dir);
  const folders = dirs.flatMap(lintDirectories);
  const files = folders.reduce((count, dir) => count + filesIn(dir).length, 0);
  const checks = [checkLines, checkFanout, checkReadmes, checkTestsBeside, checkLayout];
  const violations = [...checks.flatMap((check) => check(root, dirs)), ...checkTiers(root, packages)].sort((left, right) =>
    `${left.file}:${left.rule}`.localeCompare(`${right.file}:${right.rule}`),
  );
  for (const item of violations) console.log(`${item.file}:${item.rule}:${item.message}`);
  console.log(`checked ${packages.length} packages, ${files} files, ${folders.length} folders`);
  process.exitCode = packages.length === 0 ? 2 : violations.length > 0 ? 1 : 0;
} catch (error) {
  if (error instanceof StructureLintError) console.error(`${root}:input:${error.message}`);
  else throw error;
  process.exitCode = 1;
}
