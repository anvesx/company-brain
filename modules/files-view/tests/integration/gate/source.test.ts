import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(import.meta.dirname, "../../../src");
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files = walk(SRC).filter((f) => /\.(ts|tsx)$/.test(f));
const text = (f: string) => readFileSync(f, "utf8");

describe("source rules the spec greps for", () => {
  it("has source files at all", () => expect(files.length).toBeGreaterThan(3));
  it("never uses OFFSET pagination", () => {
    for (const f of files) {
      expect(text(f), f).not.toMatch(/OFFSET/); // the exact text the spec's rg searches for
      expect(text(f), f).not.toMatch(/\boffset\s+(\$\d|\d|\$\{)/i); // and a lowercase SQL clause
    }
  });
  it("asks the injected gate to approve somewhere", () => {
    const all = files.map(text).join("\n");
    expect(all).toMatch(/\bgate\(|openGate\(/);
    expect(all).toMatch(/\.approve\(/);
  });
  it("every file that registers a route reaches openGate, directly or through a relative import", () => {
    for (const f of files.filter((x) => /\.(get|post)\(\s*["']\//.test(text(x)))) {
      const own = text(f);
      const imported = [...own.matchAll(/from\s+["'](\.[^"']+)["']/g)].map((m) => join(f, "..", (m[1] as string).replace(/\.js$/, "")));
      const hay = [own, ...imported.flatMap((p) => [`${p}.ts`, `${p}.tsx`].filter((q) => files.includes(q))).map(text)].join("\n");
      expect(hay, `${f} reads without the gate`).toMatch(/openGate|\bgate\(|\.approve\(/);
    }
  });
  it("never reads the node or edge tables from a route file", () => {
    for (const f of files.filter((x) => /\.(get|post)\(\s*["']\//.test(text(x)))) expect(text(f), f).not.toMatch(/FROM\s+(nodes|edges)/i);
  });
});
