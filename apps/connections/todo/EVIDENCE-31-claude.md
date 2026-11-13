# SPEC-31 evidence (claude lane)

Env: PATH=/opt/homebrew/opt/postgresql@16/bin:$PATH LC_ALL=en_US.UTF-8 NODE_AUTH_TOKEN=x
DATABASE_URL=postgres://postgres@127.0.0.1:55481/postgres (temp Postgres 16)

## Commands and results

- `pnpm test` (apps/connections): 55 files, 283 tests passed.
- coverage: statements 97.47, branches 90.47, functions 96.73, lines 99.46 (threshold 90).
- `pnpm typecheck`: exit 0.
- `pnpm structure`: checked 26 packages, 1259 files, 347 folders, clean.
- `pnpm guard:fakes`: 4 findings, 1 baselined.
- `pnpm deps`: no dependency violations found.
- `biome check src tests todo/EVIDENCE-31-claude.md`: clean.
- `grep -rn 'type.*password\|type: "password"' apps/connections/src/ui`: no output, exit 1.

## Verifier fixes (eb58590 verdict CHANGES)

- Ground: in a real browser `getComputedStyle(document.body).backgroundColor` is rgb(247, 245, 239).
- Directory is grouped by the category that `GET /v1/catalog` now returns.
- Consent shows what the app reads in plain sentences; GitHub is stated as a read and write grant.
- Needs-reconnect shows Reconnect (`/v1/oauth/:provider/start`); signing in again renews the same account (tested).
- Sync is disabled and explained without a repository; input errors do not count as failures.
- Notices map to fixed codes; query text is never shown.
- Account label comes from Slack team name or a Google id_token email when present.
- Callback separates exchange failure (502) from store failure (500, logged).
- Clear repository button; favicon answers 204; no console violations in the browser run.
- Dependency build order is in the app README.

## Real browser run (1280px, 375px)

Sign in via local OIDC; grouped directory; consent; Continue to GitHub; connected row; account
page with Sync disabled and the hint; saved acme/handbook; Sync now gave Healthy, 2 items,
0 failures. Console had no messages. Screenshots: apps/connections/todo/shots-claude/.

## Not covered

- Reconnect, store-failure and needs-reconnect states were exercised by tests, not in the browser.
- GitHub returns no identity at token exchange, so its accounts keep the label "github account"; one per user unless a label is passed.
- Fonts: the design system document links Google Fonts, so the CSP allows fonts.googleapis.com and fonts.gstatic.com; none self-hosted.
- At 375px the rail wraps "Graph" onto a second line.
- No scheduler; sync is manual. Failures = consecutive failed source syncs.
- Rail "Ask" and "Graph" are Soon placeholders.
- UI page tests skip without DATABASE_URL outside CI.
