# tests/integration/browser

Spec item 17 in real Chromium (`@playwright/test` launch API, run by vitest): the real Hono server, Postgres 16 and JWKS,
a bearer JWT on every request. `axe.test.ts`: `@axe-core/playwright` (colour contrast on), zero violations, light and
dark, for the listing, a file, groups, a group, empty and 404 states, plus the 401 page; writes screenshots to
`test-results/shots/` (git-ignored). `keyboard.test.ts`: Tab order (skip link, search, filters, rows, next page), a visible
focus ring on every stop, Enter opens a file and Next page. `page.ts`: the shared rig.
