# Web UI design system

Status: spec for the UI builder. No code ships from this folder.

The UI is server-rendered HTML with one stylesheet in `features/identity/src/pages/layout.ts`.
Every normal page follows the DevX Doctrine: paper and ink, one accent, hairline rules, no
rounded corners, no gradients, no shadows, no emoji. The graph page is the one dark page.

## Files

| File | Holds |
|---|---|
| `system.md` | Principles, the graph page palette and contrast, responsive rules, accessibility |
| `tokens.md` | Fonts, light colour tokens and contrast, type, spacing, focus, states |
| `components.md` | Class names and paste-ready CSS for each component |
| `pages.md` | Wireframe and copy for each page |

## Build order

1. Paste the `:root` block from `tokens.md` and the CSS from `components.md` into `STYLE`.
2. Add the font `<link>` from `tokens.md` to `page()` in `layout.ts`.
3. Rebuild each view in `views/` and `signed/` from `pages.md`.
4. Build the graph page with the dark tokens in `system.md`.

## Builder notes

- `STYLE` is a template string. The CSS here has no backticks and no dollar-brace, so it pastes as is.
- The font link needs `style-src https://fonts.googleapis.com` and `font-src https://fonts.gstatic.com` in any CSP.
- `field()` gains an optional `error` argument. Rule 13 of the identity spec names the field; render the message under it.
- The copy button script may set the button text to "Copied" for two seconds. No other script is added.
- Sources: identity spec rule 12, connector-accounts rules 1, 2, 8, 11, google-login rule 1, graph-view rule 5.

## Known gaps in the doctrine

- Doctrine accent `#1E6FFF` on white is 4.4:1, below the 4.5:1 text minimum. This system adds `--accent-ink` (5.55:1) for text and links.
- Current inputs use `--rule` borders at 1.26:1. Fields now use `--control` (3.26:1).

The prose checker's code-term density limit is waived for this folder: these files are paste-ready CSS and hex values, named as the builder types them.
