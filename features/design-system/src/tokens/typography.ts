/**
 * Font stacks and type scale tokens.
 * Google Sans for the button only; Inter Tight for everything else.
 */

/** Font stacks. */
export const fonts = {
  /** Inter Tight for UI and display. */
  display: "'Inter Tight',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  /** Source Serif 4 for editorial. */
  serif: "'Source Serif 4',Georgia,serif",
  /** JetBrains Mono for labels and code. */
  mono: "'JetBrains Mono',ui-monospace,'SF Mono',Menlo,monospace",
  /** Google Sans for the button only. */
  google: "'Google Sans',Roboto,Arial,sans-serif",
} as const;

/** Type scale. */
export const typeScale = {
  /** 11/16, 0.14em tracking, uppercase, mono, 500. */
  eyebrow: { size: "11px", line: "16px", tracking: "0.14em", weight: 500 },
  /** 13/20, 400. */
  small: { size: "13px", line: "20px", tracking: "0", weight: 400 },
  /** 15/22, 400 (default). */
  body: { size: "15px", line: "22px", tracking: "0", weight: 400 },
  /** 17/24, 600. */
  h2: { size: "17px", line: "24px", tracking: "0", weight: 600 },
  /** 32/36, -0.02em tracking, 500. */
  h1: { size: "32px", line: "36px", tracking: "-0.02em", weight: 500 },
} as const;

/** Spacing tokens. */
export const spacing = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "24px",
  6: "32px",
  7: "48px",
  8: "64px",
  9: "96px",
} as const;
