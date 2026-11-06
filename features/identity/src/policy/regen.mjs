// Rebuilds breached.txt: the 10,000 most common passwords, in frequency order, lowercased and
// de-duplicated, taken from @zxcvbn-ts/language-common (MIT). Run: node src/policy/regen.mjs
import { writeFileSync } from "node:fs";
import { dictionary } from "@zxcvbn-ts/language-common";

const WANT = 10_000;
const seen = new Set();
for (const raw of dictionary.passwords) {
  const p = String(raw).toLowerCase();
  if (p === "" || seen.has(p)) continue;
  seen.add(p);
  if (seen.size === WANT) break;
}
if (seen.size !== WANT) throw new Error(`only ${seen.size} unique passwords, need ${WANT}`);
writeFileSync(new URL("./breached.txt", import.meta.url), `${[...seen].join("\n")}\n`);
console.log(`wrote ${seen.size} passwords`);
