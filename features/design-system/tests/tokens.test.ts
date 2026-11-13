/**
 * Token shape and generated CSS.
 */

import { describe, expect, it } from "vitest";
import { dark, darkTheme, darkTokens, fonts, light, lightTokens, nodes, spacing, typeScale } from "../src/tokens/index.ts";

const hex = /^#[0-9A-F]{6}$/i;

describe("palettes", () => {
  it("are all 6-digit hex", () => {
    for (const set of [light, dark, nodes, darkTheme]) {
      for (const v of Object.values(set)) expect(v).toMatch(hex);
    }
  });
  it("dark theme covers every light token", () => {
    expect(Object.keys(darkTheme).sort()).toEqual(Object.keys(light).sort());
  });
});

describe("scales", () => {
  it("spacing follows 4-8-12-16-24-32-48-64-96", () => {
    expect(Object.values(spacing)).toEqual([4, 8, 12, 16, 24, 32, 48, 64, 96].map((n) => `${n}px`));
  });
  it("type scale sizes grow from eyebrow to h1", () => {
    const px = Object.values(typeScale).map((s) => Number.parseInt(s.size, 10));
    expect(px).toEqual([...px].sort((a, b) => a - b));
  });
  it("has four font stacks", () => {
    expect(Object.keys(fonts)).toEqual(["display", "serif", "mono", "google"]);
  });
});

describe("css", () => {
  it("emits light vars on :root with numeric keys split", () => {
    const css = lightTokens();
    expect(css).toContain(":root{--ink:#0A0A0A");
    expect(css).toContain("--ink-2:#1A1A1A");
    expect(css).toContain("--s-9:96px");
  });
  it("emits the dark theme under prefers-color-scheme", () => {
    const css = lightTokens();
    expect(css).toContain("@media (prefers-color-scheme:dark)");
    expect(css).toContain(`--paper:${dark.bg}`);
  });
  it("emits graph vars and node colours", () => {
    const css = darkTokens();
    expect(css).toContain(`--g-node-ticket:${nodes.ticket}`);
    expect(css).toContain(`--paper:${dark.bg}`);
  });
});
