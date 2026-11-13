/**
 * Generate CSS custom properties from tokens.
 */

import { dark, darkTheme, light, nodes } from "./colors.ts";
import { fonts, spacing } from "./typography.ts";

function kebab(str: string): string {
  return str.replace(/([a-z])([A-Z]|\d)/g, "$1-$2").toLowerCase();
}

function vars(prefix: string, map: Record<string, string>): string {
  return Object.entries(map)
    .map(([k, v]) => `--${prefix}${kebab(k)}:${v}`)
    .join(";");
}

/** Light tokens on :root; dark theme under prefers-color-scheme. */
export function lightTokens(): string {
  const base = [vars("", light), vars("f-", fonts), vars("s-", spacing)];
  const dim = vars("", darkTheme);
  return `:root{${base.join(";")};color-scheme:light dark}@media (prefers-color-scheme:dark){:root{${dim}}}`;
}

/** Forced dark theme plus graph node colours, for the graph page. */
export function darkTokens(): string {
  const g = vars("g-", dark);
  const n = vars("g-node-", nodes);
  return `.graph{${vars("", darkTheme)};${g};${n};color-scheme:dark}`;
}
