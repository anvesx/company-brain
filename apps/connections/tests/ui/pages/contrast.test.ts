import { darkTheme, light } from "@anvesx/design-system/tokens";
import { wcagContrast } from "culori";
import { describe, expect, it } from "vitest";
import { appCss } from "../../../src/ui/shell/css.js";

const lightGround = /--ground:(#[0-9A-Fa-f]{6})/.exec(appCss)?.[1] ?? "";
/** In dark mode the ground follows the design-system paper token, so the ink on it is the design system's own pair. */
const darkGround = /prefers-color-scheme:dark\)\{:root\{--ground:var\(--paper\)\}\}/.test(appCss) ? darkTheme.paper : lightGround;

describe.each([
  ["light", light, lightGround],
  ["dark", darkTheme, darkGround],
])("%s scheme on the app ground", (_n, t, ground) => {
  for (const fg of ["ink", "muted", "accentInk", "warn", "ok"] as const) {
    it(`${fg} is at least 4.5:1 on ${ground}`, () => expect(wcagContrast(t[fg], ground)).toBeGreaterThanOrEqual(4.5));
  }
});
it("never hard-codes one ground for both schemes", () => {
  expect(lightGround).not.toBe("");
  expect(darkGround).not.toBe(lightGround);
});
