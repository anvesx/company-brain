/**
 * Color tokens. Light palette for normal pages, dark palette for the graph page.
 * Contrast ratios are proven by tests/contrast.test.ts, not by comments.
 */

/** Light page colors. WCAG AA verified. */
export const light = {
  ink: "#0A0A0A",
  ink2: "#1A1A1A",
  muted: "#5C6066",
  rule: "#E5E5E5",
  rule2: "#F0F0F0",
  control: "#8A8F96",
  paper: "#FFFFFF",
  paper2: "#FAFAF8",
  paper3: "#F4F4F1",
  accent: "#1E6FFF",
  accentInk: "#1560E0",
  accentSoft: "#E8F0FF",
  warn: "#C0392B",
  ok: "#0A7C53",
} as const;

/** Dark graph page colors. WCAG AA verified on #000. */
export const dark = {
  bg: "#000000",
  panel: "#0B0B0C",
  line: "#2A2D31",
  text: "#EDEDED",
  muted: "#9A9FA6",
  link: "#6BA3FF",
  control: "#7A7F86",
  warn: "#FF8A7A",
  ok: "#4ADE9B",
} as const;

/** Dark theme: maps each light token name to its dark value. */
export const darkTheme = {
  ink: dark.text,
  ink2: dark.text,
  muted: dark.muted,
  rule: dark.line,
  rule2: dark.line,
  control: dark.control,
  paper: dark.bg,
  paper2: dark.panel,
  paper3: dark.panel,
  accent: dark.link,
  accentInk: dark.link,
  accentSoft: dark.panel,
  warn: dark.warn,
  ok: dark.ok,
} as const;

/** Node colors. All >= 7:1 on black. */
export const nodes = {
  person: "#F5F5F5",
  team: "#F0E442",
  project: "#56D0F0",
  repo: "#2BD4A0",
  channel: "#F08CC8",
  ticket: "#FF7A33",
  documentDrive: "#5B9BFF",
  documentNotion: "#A9BEFF",
  documentSlack: "#8A8CFF",
  documentGithub: "#C2A8FF",
  documentOther: "#8FA0B8",
} as const;
