# src

Status: built. `createIdentity(config)` returns the better-auth instance, the identity port, the HTTP routes and pages.

| File        | Job                                                                                                 |
| ----------- | --------------------------------------------------------------------------------------------------- |
| `index.ts`  | Public exports and `createIdentity`.                                                                |
| `config.ts` | Validates `IdentityConfig` (BAD_INPUT naming the field), fills defaults, holds the only `Date.now`. |
| `port.ts`   | `IdentityPort` (`fromSession`, `fromBearer`, `require`), `protect` and the CSRF helpers.            |
| `errors.ts` | `IdentityError` with the five codes and an optional `field`.                                        |

Folders: `auth/` (better-auth setup), `guard/` (origin, limits, bearer, session), `install/` (config renderer),
`policy/` (password and email rules), `routes/` (HTTP surface), `consent/` (what the consent and account pages show) and `pages/` (server-rendered HTML).
