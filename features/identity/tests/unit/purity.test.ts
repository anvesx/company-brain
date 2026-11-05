import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { INSTALL_CLIENTS, renderInstall } from "../../src/index.js";

const SRC = new URL("../../src/", import.meta.url).pathname;
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => (statSync(join(dir, name)).isDirectory() ? walk(join(dir, name)) : name.endsWith(".ts") ? [join(dir, name)] : []));
// Stryker rewrites src files for the mutation run: it adds helper code and a copy of every line per mutant,
// so a text scan would count clock reads and I/O names that are not in the real source. Those files read as
// empty there; the normal vitest run scans the real text.
const instrumented = (path: string): boolean => readFileSync(path, "utf8").includes("function stryNS_");
const source = (path: string): string => (instrumented(path) ? "" : readFileSync(path, "utf8"));

describe("purity", () => {
  it("rule 14: Date.now appears once in src, as the default clock in config.ts", () => {
    const hits = walk(SRC).flatMap((file) => (source(file).match(/Date\.now/g) ?? []).map(() => file.slice(SRC.length)));
    expect(hits).toEqual(instrumented(join(SRC, "config.ts")) ? [] : ["config.ts"]);
  });

  it("rule 14: src never reads the wall clock or randomness another way", () => {
    for (const file of walk(SRC)) expect(source(file), file).not.toMatch(/new Date\(\s*\)|Math\.random|performance\.now/);
  });

  it("rule 14: the install renderer imports no I/O and reads no environment", () => {
    for (const name of ["render.ts", "templates.ts"]) {
      const text = source(join(SRC, "install", name));
      expect(text, name).not.toMatch(/node:(fs|net|http|https|child_process)|process\.env|\bfetch\(/);
    }
  });

  it("rule 14: equal input renders equal output for every client", () => {
    const manifest = { name: "company-brain", url: "https://brain.example.com/mcp" };
    for (const client of INSTALL_CLIENTS) expect(renderInstall({ ...manifest }, client)).toEqual(renderInstall({ ...manifest }, client));
  });
});
