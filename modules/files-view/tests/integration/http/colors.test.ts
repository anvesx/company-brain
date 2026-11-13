import { wcagContrast } from "culori";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { boot, type Env } from "../support/app.js";

let css = "";
let own = "";
let env: Env;
beforeAll(async () => {
  env = await boot();
  const html = (await env.call("/files", { tenant: "c", user: "alice" })).body;
  const blocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1] as string);
  css = blocks.join("\n");
  own = blocks.find((b) => b.includes("ul.tree")) ?? "";
}, 120_000);
afterAll(async () => env.stop(), 120_000);

const DARK = /@media\s*\(prefers-color-scheme:\s*dark\)\s*\{:root\{([^}]*)\}\}/;
const vars = (block: string): Record<string, string> =>
  Object.fromEntries([...block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map((m) => [m[1] as string, m[2] as string]));
const rules = (): { fg: string | undefined; bg: string | undefined }[] =>
  [
    ...css
      .replace(DARK, "")
      .replace(/\.graph\{[^}]*\}/, "")
      .matchAll(/\{([^{}]*)\}/g),
  ].map((m) => ({
    fg: /(?:^|;)color:var\(--([a-z0-9-]+)\)/.exec(m[1] as string)?.[1],
    bg: /(?:^|;)background(?:-color)?:var\(--([a-z0-9-]+)\)/.exec(m[1] as string)?.[1],
  }));
/** Pairs actually used: a rule that sets both colours, and every text colour on the page background (paper). */
const pairs = (): [string, string][] => {
  const r = rules();
  const out = new Set<string>(r.filter((x) => x.fg && x.bg).map((x) => `${x.fg}|${x.bg}`));
  for (const x of r) if (x.fg && x.fg !== "paper") out.add(`${x.fg}|paper`);
  return [...out].map((p) => p.split("|") as [string, string]);
};

describe("light and dark tokens meet WCAG AA", () => {
  it("serves the tokens, a dark override, and uses at least four distinct pairs", () => {
    expect(css).toMatch(/prefers-color-scheme:\s*dark/);
    expect(Object.keys(vars(css)).length).toBeGreaterThan(8);
    expect(Object.keys(vars(DARK.exec(css)?.[1] ?? "")).length).toBeGreaterThan(8);
    expect(pairs().length).toBeGreaterThanOrEqual(4);
  });
  it("only design-system tokens are used for colour, no hex literals in the screen rules", () => {
    expect(rules().length).toBeGreaterThan(5);
    expect(own.length).toBeGreaterThan(500);
    expect(own).not.toMatch(/(?:color|background(?:-color)?|border[a-z-]*):\s*#|border[a-z-]*:[^;]*#[0-9a-fA-F]{3}/);
  });
  for (const scheme of ["light", "dark"] as const) {
    it(`${scheme}: every foreground over its background is at least 4.5:1`, () => {
      const palette = { ...vars(/:root\{([^}]*)\}/.exec(css)?.[1] ?? ""), ...(scheme === "dark" ? vars(DARK.exec(css)?.[1] ?? "") : {}) };
      for (const [f, b] of pairs()) {
        expect(palette[f], `${f} defined`).toBeDefined();
        expect(palette[b], `${b} defined`).toBeDefined();
        expect(wcagContrast(palette[f] as string, palette[b] as string), `${scheme}: ${f} on ${b}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});
