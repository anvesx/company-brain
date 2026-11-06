import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pkg = new URL("../../", import.meta.url).pathname; // the package folder
const files = (dir: string) => readdirSync(`${pkg}${dir}`).filter((f) => f.endsWith(".js"));

describe("the build copies the page scripts into dist", () => {
  it("after two builds every dist script equals its source and nothing is nested", () => {
    // `copy:page` is the build's second step. Running it twice is what a developer does on every rebuild:
    // a plain `cp -R src dst` nests the second copy inside the first (dist/page/script/script).
    for (let run = 0; run < 2; run++) execFileSync("pnpm", ["run", "copy:page"], { cwd: pkg, stdio: "pipe" });
    expect(existsSync(`${pkg}dist/page/script/script`)).toBe(false);
    expect(files("dist/page/script")).toEqual(files("src/page/script"));
    for (const name of files("src/page/script")) {
      expect(readFileSync(`${pkg}dist/page/script/${name}`, "utf8")).toBe(readFileSync(`${pkg}src/page/script/${name}`, "utf8"));
    }
  }, 60_000);
});
