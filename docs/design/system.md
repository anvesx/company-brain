# System: principles, graph page, responsive, accessibility

## Principles

1. Remove before adding. One headline, one rule, one primary button per view.
2. Type does the work: Inter Tight for UI, mono for labels, one italic serif word per h1 at most.
3. One accent. `--accent` draws rings and rules. `--accent-ink` draws text and links.
4. Hairlines divide content. No cards with radius, no shadows, no gradients, no emoji.
5. Say the state in words as well as colour: "Active", "Needs sign in", "Not configured".

## Light only for normal pages (decision)

Sign-in, connections, account and the install guide stay light. The doctrine bans full-page inversion.
The install guide is a document people read and copy from. One light palette means one contrast
proof. Add `<meta name="color-scheme" content="light">` so browsers do not force-darken the inputs.
Revisit if users ask; the tokens are variables, so a dark set is one block.

## Graph page: dark palette

The graph page is the one deliberately dark page (graph-view rule 5). It shares the font stack, the
spacing scale, the radius 0 rule and the focus ring shape with every other page. It adds the tokens below.

```css
.graph{--g-bg:#000;--g-panel:#0B0B0C;--g-line:#2A2D31;--g-text:#EDEDED;--g-muted:#9A9FA6;--g-link:#6BA3FF;--g-control:#7A7F86;color-scheme:dark}
.graph :focus-visible{outline-color:#FFF}
```

| Node group | Hex | On `#000` | On panel `#0B0B0C` | Radius |
|---|---|---|---|---|
| person | `#F5F5F5` | 19.26 | 18.05 | 4 |
| team | `#F0E442` | 15.88 | 14.88 | 7 |
| project | `#56D0F0` | 11.68 | 10.94 | 7 |
| repo | `#2BD4A0` | 11.03 | 10.33 | 5 |
| channel | `#F08CC8` | 9.29 | 8.70 | 4 |
| ticket | `#FF7A33` | 8.08 | 7.57 | 4 |
| document:drive | `#5B9BFF` | 7.58 | 7.10 | 3 |
| document:notion | `#A9BEFF` | 11.50 | 10.77 | 3 |
| document:slack | `#8A8CFF` | 7.28 | 6.82 | 3 |
| document:github | `#C2A8FF` | 10.34 | 9.69 | 3 |
| document:other source | `#8FA0B8` | 7.89 | 7.39 | 3 |
| text / muted / link | `#EDEDED` / `#9A9FA6` / `#6BA3FF` | 17.94 / 7.88 / 8.31 | 16.80 / 7.39 / 7.78 | |
| search border | `#7A7F86` | 5.21 | 4.88 | |

Rules: every node colour is 7:1 or better on black, so bloom does not wash it out. Documents are a
blue-to-violet family, so "a document" reads at a glance and the source reads on hover and in the
legend. A source with no row takes the next of `#8FA0B8`, `#7FB3C8`, `#B5A99A`, then repeats. Size
and legend swatch back up colour; the legend always shows swatch, name and count.
Bloom: strength 0.8, radius 0.5, threshold 0.15. Links `rgba(255,255,255,.14)`; links of the selected node `--g-link`.
Labels on hover: 12px mono `--g-text` on `rgba(0,0,0,.8)`. `--g-line` (1.4:1) is a decorative edge only.

## Responsive

Breakpoint 480px. The 400px target is covered.

- Gutter 24 to 16, h1 32 to 24, one tile per row, form and buttons full width, inputs 16px.
- Tables lose the header row and stack as label-less rows: name, then meta, then action.
- Touch devices get 44px minimum targets.
- Graph: the canvas fills the viewport. The legend collapses behind a "Groups" button. Search spans the top. The side panel is a bottom sheet at 50% height with a Close button.

```css
@media (max-width:480px){main{padding:var(--s-5) var(--s-4) var(--s-7)}h1{font-size:24px;line-height:28px}.tiles{grid-template-columns:1fr}form{max-width:none}.field input{font-size:16px}.btn{width:100%}
.table thead{position:absolute;left:-9999px}.table tr{display:block;border-bottom:1px solid var(--rule);padding:var(--s-3) 0}.table td{display:block;border:0;padding:var(--s-1) 0;text-align:left!important}}
@media (pointer:coarse){.btn,.field input{min-height:44px}}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important;scroll-behavior:auto!important}}
```

## Accessibility

- Focus order follows reading order: skip link, header links, main content top to bottom, then footer. No positive `tabindex`.
- Add `<a class="skip" href="#main">Skip to content</a>`, visible on focus only. The `<main>` carries `id="main"`.
- Every input has a visible `<label for>`. Placeholders are examples, never labels. `autocomplete` stays as the current forms set it.
- Errors: summary in a `role="alert"` flash, plus the field message tied by `aria-describedby`. The first invalid field gets focus.
- Text contrast is at least 4.5:1 and borders at least 3:1, proven in the tables in `tokens.md` and above.
- Tiles are one form with one button; its accessible name is the visible text plus the provider, for example `aria-label="Sign in again to GitHub"`.
- Graph: the canvas is `role="img"` with `aria-label="Graph of N nodes"`. Legend toggles use `aria-pressed`. Search results are a list of buttons, so every node is reachable by keyboard; Enter focuses the node.
- Side panel: opens with focus on its heading, Escape closes it and returns focus to the trigger.
- Reduced motion: `warmupTicks` 260, `cooldownTicks` 0 (same 260 total ticks, so the layout is settled on first paint), camera moves in 0 ms, no bloom pulse, no auto-rotate, no drag inertia.
