# SPEC-31 evidence (claude lane)

Env: PATH=/opt/homebrew/opt/postgresql@16/bin:$PATH LC_ALL=en_US.UTF-8 NODE_AUTH_TOKEN=x
DATABASE_URL=postgres://postgres@127.0.0.1:55481/postgres (temp Postgres 16)

Fresh clone: `pnpm install`, then both `pnpm --filter '@anvesx/connections-app...' build` and
`pnpm --filter '@anvesx/brain-app...' build` (typecheck and tests need both), then the commands below.

## Commands and results

- `pnpm exec vitest run` (apps/connections): 56 files, 297 tests passed.
- coverage: statements 97.66, branches 90.41, functions 96.81, lines 99.68 (threshold 90).
- `pnpm typecheck`: exit 0.
- `pnpm structure`: clean (no file over 80 lines, tests/ui/pages holds 5 files).
- `pnpm guard:fakes`: 4 findings, 1 baselined.
- `pnpm deps`: no dependency violations found.
- `biome check src tests todo/EVIDENCE-31-claude.md`: clean.
- `grep -rn 'type.*password\|type: "password"' apps/connections/src/ui`: no output, exit 1.

## Second verify of f405615 (CHANGES)

1. Dark mode: the ground is `--ground` (light #F7F5EF), and in dark it is the design-system `--paper`
   (#000000). Real browser with prefers-color-scheme dark: body rgb(0, 0, 0). Test
   `tests/ui/pages/contrast.test.ts` uses culori `wcagContrast` and checks ink, muted, accent ink,
   warn and ok against the ground in both schemes at 4.5 or more.
2. `/sign-in` is a centered card with the shell ground and serif title, light and dark.
3. 375px rail: one row, no wrap, gap between "Ask" and "Soon" (measured: 3 items on one row, top 38).
4. Needs-reconnect no longer shows the repository hint (test).
5. Store failure reads "Could not save the connection, try again." (`oauth_error=store`).
6. Reconnect and store failure were driven in the browser (below); the console.error is asserted in a test.
7. Category rules are lighter; unavailable connectors are one "Not available on this server" list with one
   reason line; Disconnect is its own confirm panel (`?confirm=1`, "Keep it") instead of red details.

## Browser checks (real Chromium pane, local OIDC, real Postgres)

Contrast script (every visible text node against its effective background) run in both schemes:
dark 1280 (home, account, needs-reconnect, confirm), dark 375 (home, account), light 1280 (home),
light 375 (home, account). Zero failures, scrollWidth equals viewport each time.
Reconnect: needs-reconnect account showed Reconnect GitHub, no stale hint; Reconnect returned the same
account id (one row). Store failure: with create forced to throw, connecting landed on
`/?oauth_error=store` with the new message. Console had no violations.
Screenshots: apps/connections/todo/shots-claude/.

## Not covered

- axe-core: loading downloaded axe into the page was refused by the permission layer, so I did not run it.
  The in-page contrast script above stands in for the contrast rules only; roles, names and focus order
  were not machine-audited.
- Sign-in card was checked in dark at 1280; light and 375 views of it are CSS-covered only.
- GitHub returns no identity at token exchange, so its accounts keep the label "github account".
- Fonts: the design system document links Google Fonts, so the CSP allows fonts.googleapis.com and
  fonts.gstatic.com; none self-hosted.
- No scheduler; sync is manual. Failures = consecutive failed source syncs.
- Rail "Ask" and "Graph" are Soon placeholders.
- UI page tests skip without DATABASE_URL outside CI.
