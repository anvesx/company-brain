# Tokens (normal pages)

Light only. See `system.md` for the dark graph page and the reason the other pages stay light.

## Fonts

All Google Fonts. Google's button font is Google Sans Medium, which the css2 API does not serve; the stack names it first for machines that have it and falls back to Roboto, which is loaded only for that button.

```html
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Roboto:wght@500&family=Source+Serif+4:ital,opsz,wght@1,8..60,400&display=swap" rel="stylesheet">
```

| Role | Stack |
|---|---|
| Display and UI | `'Inter Tight', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` |
| Editorial italic | `'Source Serif 4', Georgia, serif` |
| Labels, code, numerics | `'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace` |
| Google button only | `'Google Sans', Roboto, Arial, sans-serif` |

## Root block

```css
:root{--ink:#0A0A0A;--ink-2:#1A1A1A;--muted:#5C6066;--rule:#E5E5E5;--rule-2:#F0F0F0;--control:#8A8F96;
--paper:#FFFFFF;--paper-2:#FAFAF8;--paper-3:#F4F4F1;--accent:#1E6FFF;--accent-ink:#1560E0;--accent-soft:#E8F0FF;
--warn:#C0392B;--ok:#0A7C53;
--f-display:'Inter Tight',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;--f-serif:'Source Serif 4',Georgia,serif;
--f-mono:'JetBrains Mono',ui-monospace,'SF Mono',Menlo,monospace;--f-google:'Google Sans',Roboto,Arial,sans-serif;
--s-1:4px;--s-2:8px;--s-3:12px;--s-4:16px;--s-5:24px;--s-6:32px;--s-7:48px;--s-8:64px;--s-9:96px}
```

## Contrast, light pages (WCAG 2.2, computed from the hex values)

| Pair | Ratio | Use | Pass |
|---|---|---|---|
| ink on paper | 19.80 | Body, headings | WCAG level AA (AA), WCAG level AAA (AAA) |
| muted on paper / paper-2 / paper-3 | 6.33 / 6.05 / 5.74 | Hints, metadata | AA |
| accent-ink on paper / paper-2 / paper-3 | 5.55 / 5.31 / 5.04 | Links, text accents | AA |
| accent on paper | 4.40 | Rings, rules, borders only, never text | 3:1 non-text |
| white on accent-ink | 5.55 | Primary button hover | AA |
| white on ink | 19.80 | Primary button | AA, AAA |
| warn on paper / paper-2 | 5.44 / 5.20 | Errors, needs-auth | AA |
| ok on paper | 5.22 | Active status | AA |
| control on paper | 3.26 | Input and button borders | 3:1 non-text |
| `#1F1F1F` on white | 16.48 | Google button text | AA |
| `#747775` on white | 4.53 | Google button border | AA |
| muted-2 `#8A8F96` on paper | 3.26 | Never used for text | fails, banned |

## Type scale

| Token | Size / line | Weight | Use |
|---|---|---|---|
| eyebrow | 11 / 16, 0.14em, upper, mono | 500 | Label above a title, chips |
| small | 13 / 20 | 400 | Hints, errors, table meta |
| body | 15 / 22 | 400 | Default. h3 is body at 600. Code is mono 13 / 20 |
| h2 | 17 / 24 | 600 | Section titles |
| h1 | 32 / 36, -0.02em | 500 | Page title; one word may be italic serif in accent-ink |

Inputs use 16px on small screens so iOS does not zoom. Numerics use `font-feature-settings:"tnum"`.

## Spacing

Only 4, 8, 12, 16, 24, 32, 48, 64, 96. Page gutter 24 (16 at 400 px). Page width 720 for forms and prose, 960 for tiles and tables. Field gap 16. Section gap 32. Rules are 1px `--rule`; a section title sits on a 1px `--ink` rule.

## Focus

`:focus-visible{outline:2px solid var(--accent);outline-offset:2px}` on every interactive element. Never remove it. The ring is 4.40:1 against paper. Inputs keep the ring plus an ink border. On the dark page the ring is white (21:1).

## States

| State | Look | Not colour alone |
|---|---|---|
| default | Border `--control`, text ink | |
| hover | Primary fills `--accent-ink`; secondary fills `--paper-3`; tile border turns ink | Pointer cursor |
| focus | Focus ring above | Ring shape |
| disabled | Fill `--paper-3`, text muted, border `--rule`, `not-allowed` | `disabled` attribute, never hidden |
| error | Border and message in `--warn`, `aria-invalid` | Message text starts with the cause |
| needs-auth | Chip and left rule in `--warn`, primary "Sign in again" | Chip says "Needs sign in" |
| not-configured | Dashed `--control` border, muted text, disabled button | Chip says "Not configured" |
