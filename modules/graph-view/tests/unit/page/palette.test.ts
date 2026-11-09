import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const state = readFileSync(new URL("../../../src/page/script/state.js", import.meta.url), "utf8");
const colors: Record<string, string> = Object.fromEntries([...state.matchAll(/"?([\w:]+)"?: "(#[0-9A-F]{6})"/g)].map((m) => [m[1] as string, m[2] as string]));

// Hue in degrees (0 to 360) of a #RRGGBB colour.
function hue(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
  const [max, min] = [Math.max(r, g, b), Math.min(r, g, b)];
  const d = max - min;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}
// Relative luminance, so the contrast against the black canvas is (L + 0.05) / 0.05.
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

describe("the legend palette", () => {
  it("the document colours of the connectors are at least 40 degrees of hue apart", () => {
    const docs = ["gdrive", "notion", "slack", "github"].map((s) => colors[`document:${s}`] as string);
    for (const [i, a] of docs.entries()) {
      for (const b of docs.slice(i + 1)) {
        const gap = Math.abs(hue(a) - hue(b));
        expect(Math.min(gap, 360 - gap), `${a} vs ${b}`).toBeGreaterThanOrEqual(40);
      }
    }
  });

  it("every colour keeps 7:1 on the black canvas", () => {
    for (const [name, hex] of Object.entries(colors)) expect((lum(hex) + 0.05) / 0.05, name).toBeGreaterThanOrEqual(7);
  });
});
