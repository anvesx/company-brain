# SPEC-31 evidence (claude lane)

Env: PATH=/opt/homebrew/opt/postgresql@16/bin:$PATH LC_ALL=en_US.UTF-8 NODE_AUTH_TOKEN=x
DATABASE_URL=postgres://postgres@127.0.0.1:55481/postgres (temp Postgres 16)

## Commands and results
- `pnpm test` (apps/connections): 54 files, 279 tests passed.
- coverage: statements 97.71, branches 91.4, functions 96.3, lines 99.66 (threshold 90).
- `pnpm typecheck`: exit 0.
- `pnpm structure`: checked 26 packages, 1256 files, 347 folders, clean.
- `pnpm guard:fakes`: 4 findings, 1 baselined.
- `pnpm deps`: no dependency violations found.
- `biome check apps/connections/src apps/connections/tests`: no fixes, clean.
- `grep -rn 'type.*password\|type: "password"' apps/connections/src/ui`: no output, exit 1.

## Real browser run (1280px, 375px)
Sign in via local OIDC; Connections; Add GitHub; consent page; Continue to GitHub
(302 to local provider, back to `/?connected=<id>`); "Not yet synced" row; account page;
saved repo acme/handbook; Sync now gave Healthy, 2 items, 0 failures; Disconnect with
confirm gave the empty state; Sign out landed on /sign-in. At 375px the page has no
horizontal scroll (scrollWidth 375). Screenshots: apps/connections/todo/shots-claude/.

## Not covered
- Error and needs-reconnect states were covered by tests only, not in the browser.
- Catalog has no category field; directory is grouped by availability.
- No scheduler; sync is manual (Sync now). Failures = consecutive failed syncs.
- Scopes are shown as raw identifiers.
- Rail "Ask" and "Graph" are Soon placeholders.
- UI page tests skip without DATABASE_URL outside CI.
- Different-vendor review not yet done.
