# @anvesx/e2e

Browser and HTTP end-to-end tests for `apps/connections` (board ticket #45, first slice), run with `@playwright/test` (Apache-2.0).

Playwright starts the real launcher, `apps/connections/dist/bin.js`, on `127.0.0.1:18788` over fresh SQLite files in a temp directory. Test bearers are signed with the same 32-character test secret the app's own tests use. `root` in tenant `t1` is the only admin. Nothing in the app is replaced.

## Run

```sh
pnpm turbo run build --filter=@anvesx/connections-app
pnpm --filter @anvesx/e2e exec playwright install chromium
pnpm --filter @anvesx/e2e e2e
```

Screenshots and traces land in `tools/e2e/test-results/` (git-ignored). Open a trace with `pnpm --filter @anvesx/e2e exec playwright show-trace <trace.zip>`.

## Layout

- `playwright.config.ts`: server, port, trace and screenshot settings.
- `src/`: `creds.ts` (bearer minting), `ui.ts` (sign in through the page).
- `tests/api/`: the HTTP API through Playwright's request client.
- `tests/ui/`: the page in Chromium.

The script is `e2e`, not `test`, so the pre-commit `turbo run test` does not start a browser.

## Not covered

OAuth sign-in and callback, sync and the graph file, the token file, re-authorise, disconnect, editing zones on the detail page, a custom connector registered from the page (the page has no such form; it is driven over HTTP), a custom oauth2 connector, expired bearers, and any browser but Chromium. There is no CI job yet: `apps/connections` is excluded from CI builds while it links `@anvesx/connectors` from a sibling checkout.

To reuse an installed Chromium instead of downloading one, set `E2E_CHROMIUM_PATH` to its executable.
