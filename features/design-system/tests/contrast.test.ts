/**
 * WCAG contrast tests. Ratios are computed with culori from the token values;
 * nothing here is hardcoded. Text needs 4.5:1, non-text 3:1, graph nodes 7:1.
 */

import { wcagContrast } from "culori";
import { describe, expect, it } from "vitest";
import { dark, darkTheme, light, nodes } from "../src/tokens/index.ts";

type Theme = Record<keyof typeof light, string>;
const themes: [string, Theme][] = [
  ["light", light],
  ["dark", darkTheme],
];
const text = ["ink", "ink2", "muted", "accentInk", "warn", "ok"] as const;
const grounds = ["paper", "paper2", "paper3"] as const;

describe.each(themes)("%s theme", (_name, t) => {
  for (const fg of text) {
    for (const bg of grounds) {
      it(`${fg} on ${bg} is at least 4.5:1`, () => {
        expect(wcagContrast(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
  for (const fg of ["control", "accent"] as const) {
    it(`${fg} on paper is at least 3:1`, () => {
      expect(wcagContrast(t[fg], t.paper)).toBeGreaterThanOrEqual(3);
    });
  }
  it("primary button text (paper on ink) is at least 7:1", () => {
    expect(wcagContrast(t.paper, t.ink)).toBeGreaterThanOrEqual(7);
  });
});

describe("graph page", () => {
  for (const key of ["text", "muted", "link", "control"] as const) {
    it(`${key} on black is at least 4.5:1`, () => {
      expect(wcagContrast(dark[key], dark.bg)).toBeGreaterThanOrEqual(4.5);
    });
  }
  for (const [name, color] of Object.entries(nodes)) {
    it(`node ${name} on black is at least 7:1`, () => {
      expect(wcagContrast(color, dark.bg)).toBeGreaterThanOrEqual(7);
    });
  }
  it("the checker rejects a failing pair", () => {
    expect(wcagContrast("#777777", "#888888")).toBeLessThan(4.5);
  });
});
