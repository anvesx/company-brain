# tests

The acceptance suite for `@anvesx/identity`, written before the code (spec section
"Acceptance tests"). Each test title starts with the spec rule it pins, for example
`rule 6: refresh rotates and the old refresh token is rejected`.

| Folder         | What it proves                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------- |
| `support/`     | Shared helpers: temp SQLite, a real HTTP server, a cookie-keeping client, the OAuth client steps. |
| `unit/`        | Config, errors, purity, sign-up, passwords, cookies, lockout, the port, organizations.            |
| `install/`     | The install renderer: golden file per client, parse-back, input checks.                           |
| `integration/` | The MCP OAuth flow end to end through the mounted Hono app.                                       |
| `property/`    | fast-check properties over the renderer, the port, redirects and token claims.                    |
| `scale/`       | Rule 15 timings, printed with their counts; run by `pnpm scale`, alone, like CI does.             |
| `e2e/`         | Playwright against `e2e/server.ts`; skipped unless `PLAYWRIGHT=1`.                                |

Nothing here replaces a dependency: every test runs better-auth over a real SQLite file in
its own temp folder, behind a real HTTP server on a free port.

## Mutation score

`pnpm --filter @anvesx/identity mutation` (Stryker, break 80) on 2026-11-06: **90.02 %** of
1,403 valid mutants (1,089 killed, 174 timed out, 113 survived, 27 never covered; 1 runtime
error excluded). `reports/mutation.json` holds the per-mutant list; `tests/scale` and `tests/e2e` are
excluded from the run by the repo's `vitest.stryker.config.ts`.

What the 140 survivors and uncovered mutants are (counts per file from the report), and why they stay:

| File                                                                                          | Count | Why no test kills them                                                                                                                                                  |
| --------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `consent/view.ts`, `consent/authorized.ts`                                                    | 19    | `listOf` comma and space forms, and the empty-client branch: better-auth's adapter always stores JSON arrays, so those branches are unreachable without a fake adapter. |
| `guard/bearer.ts`                                                                             | 14    | `proven` cache eviction at 1,000 distinct tokens needs 1,000 real sign-ins per test; the `exp` guard on line 49 is equivalent for tokens better-auth signs.             |
| `pages/actions.ts`, `pages/forms.ts`, `pages/signed/*`, `pages/serve.ts`, `install/render.ts` | 30    | Label and attribute strings that the Playwright suite checks by reading the page; Stryker excludes `tests/e2e`.                                                         |
| `routes/validate.ts`, `routes/mount.ts`, `routes/register.ts`, `routes/errors.ts`             | 29    | `X-Forwarded-For` hop parsing and DCR field defaults where the equivalent forms give the same client address or the same stored client.                                 |
| `port.ts`, `auth/clients.ts`, `auth/mcp.ts`, `auth/options.ts`                                | 22    | Scope-string splitting and invitation-mail text; the mail body is prose, the split forms agree on every scope better-auth issues.                                       |
| `policy/password.ts`                                                                          | 15    | Error message wording. The count predates removing `policy/hash.ts` (now better-auth's default); rerun `mutation` to refresh.                                           |
| `config.ts`, `guard/limits.ts`, `guard/session.ts`                                            | 11    | Human-readable config errors; `<` vs `<=` at the 3,600,000 ms boundary and `Math.max(1, …)` are equivalent mutants.                                                     |

A survivor is only accepted here with a reason in this table; the next round starts from the rows above.
