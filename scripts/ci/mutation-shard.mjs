// Prints the comma-separated `--mutate` file list for one shard of a package.
// usage: node scripts/ci/mutation-shard.mjs <package-dir> <shard-index> <shard-count>
// Every file the package's stryker config would mutate lands in exactly one
// shard (largest first, greedy by byte size), so no mutant is dropped.
import { globSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const [dir, indexArg, countArg] = process.argv.slice(2);
const index = Number(indexArg);
const count = Number(countArg);
if (!dir || !Number.isInteger(index) || !Number.isInteger(count) || count < 1 || index < 0 || index >= count) {
  console.error("usage: mutation-shard.mjs <package-dir> <index> <count>");
  process.exit(2);
}

const config = JSON.parse(readFileSync(join(dir, "stryker.config.json"), "utf8"));
const include = config.mutate.filter((g) => !g.startsWith("!"));
const exclude = new Set(config.mutate.filter((g) => g.startsWith("!")).flatMap((g) => globSync(g.slice(1), { cwd: dir })));
const files = [...new Set(include.flatMap((g) => globSync(g, { cwd: dir })))].filter((f) => !exclude.has(f)).sort();
if (files.length < count) {
  console.error(`${dir}: ${files.length} files cannot fill ${count} shards`);
  process.exit(2);
}

const buckets = Array.from({ length: count }, () => ({ size: 0, files: [] }));
for (const f of files.map((f) => ({ f, size: statSync(join(dir, f)).size })).sort((a, b) => b.size - a.size || a.f.localeCompare(b.f))) {
  const lightest = buckets.reduce((m, b) => (b.size < m.size ? b : m));
  lightest.files.push(f.f);
  lightest.size += f.size;
}
console.log(buckets[index].files.sort().join(","));
