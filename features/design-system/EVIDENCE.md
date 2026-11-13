# WP-12 design system: evidence

Package `features/design-system` (`@anvesx/design-system`), branch `wp/12-design-system`.
Run on 2026-11-13 after `NODE_AUTH_TOKEN=x pnpm install`. Exit codes are real.

| Command (repo root unless noted) | Exit | Result |
| --- | --- | --- |
| `pnpm exec biome check features/design-system` | 0 | 39 files, no fixes; one repo-wide config deprecation info |
| `pnpm structure` | 0 | checked 21 packages, 1113 files, 307 folders |
| `pnpm guard:fakes` | 0 | 4 findings, 1 baselined (baseline file untouched) |
| `pnpm typecheck` (package) | 0 | strict, src and tests |
| `pnpm build` (package) | 0 | emits `dist/src`; `import("./dist/src/index.js")` renders a page |
| `pnpm test` (package) | 0 | 4 files, 88 tests passed |

Coverage (v8, threshold 90, scoped to `src/**/*.{ts,tsx}`): statements 100% (71/71),
branches 100% (36/36), functions 100% (24/24), lines 100% (56/56).

## What changed from the glm-5 draft

- Deleted 14 stale duplicate components in `src/components` root; two of them had drifted from the folder versions.
- Tests were `.tsx`, which the shared `vitest.config.ts` (`tests/**/*.test.ts`) never ran. Rewritten as `.test.ts` using `hono/jsx`.
- Contrast tests now compute ratios with culori `wcagContrast` from the tokens, for light and dark themes
  (text 4.5:1 on three grounds, control and accent 3:1, nodes 7:1, plus a negative control).
- Bug found by the new tests: CSS variable names `--s--1`, `--ink2` did not match the stylesheet (`--s-1`, `--ink-2`). Fixed.
- `Document` previously linked no CSS variables. It now inlines one stylesheet generated from the tokens.
- Dark: `prefers-color-scheme: dark` remaps all tokens; `<Document dark>` forces the graph theme. Added `warn` and `ok` for dark.
- Chip rendered `class="chip "`; fixed. Removed unused `primary` and inline `onclick` props.
- Merged files to meet the 80-line and five-file limits; `tsconfig.build.json` folded into `tsconfig.json`.

## NOT done

1. Mutation: `pnpm mutation` fails to start ("Cannot find TestRunner plugin vitest"); score is unmeasured, the 80 bar is unproven.
2. No axe or browser accessibility run (plan row 13). Only computed contrast and ARIA attribute assertions exist.
3. No component snapshot tests.
4. Google Fonts load from a CDN; no self-hosted fonts, no measured page weight (the 150 KB budget is unmeasured).
5. Stylesheet is a hand-written string; no CSS bundle or minification. No page templates.
6. Dark-mode contrast is proven for text and controls, not for every hover state or the Google button.
7. Row 9 to 12 (observability, config, migrations) do not apply to a presentation package.
8. Reviewer from another vendor not yet run.
