# Brief: connector accounts, token refresh, Google login

Specs: [connector-accounts](../specs/feature/connector-accounts.md),
[google-login](../specs/feature/google-login.md). ADRs 0008, 0009. Package: `@anvesx/identity`
(better-auth 1.7.18) plus the new `services/token-refresh`.

## Goal

A signed-in person links a connector from a tile on `/connections`, its tokens are sealed at
rest, `port.accessToken` hands out a fresh token, a sweep refreshes due tokens across replicas
without double refreshes, and "Continue with Google" signs people in. Done means every test
listed below passes and nothing else changed.

## Registry decision (C1)

| Part | Decision | Source |
|---|---|---|
| OAuth, PKCE, state, token exchange, linking | install (already installed) | better-auth `genericOAuth`, `linkSocialAccount`, `unlinkAccount`, account linking |
| AES-256-GCM seal | extract (C2) | `apps/connections/src/accounts/rules/crypto.ts`; additional data is the column name, because the field transform does not see the row id |
| Sweep, lease, due-row select | build new | `services/token-refresh`, shaped like `services/graph-sync` |

## Acceptance tests (written first, do not edit)

| File | Tests | Rules |
|---|---|---|
| `features/identity/tests/unit/connectors/seal.test.ts` | 4 | connector 3 |
| `features/identity/tests/unit/connectors/catalog.test.ts` | 4 | connector 11 |
| `features/identity/tests/integration/connectors/link.test.ts` | 5 | connector 1, 2 |
| `features/identity/tests/integration/connectors/rest.test.ts` | 4 | connector 3 |
| `features/identity/tests/integration/connectors/token.test.ts` | 5 | connector 4 |
| `features/identity/tests/integration/connectors/tiles.test.ts` | 5 | connector 8, 9, 11 |
| `features/identity/tests/integration/google/{signin,link,refuse}.test.ts` | 4, 2, 4 | google 1 to 6 |
| `services/token-refresh/tests/unit/{select,lease}.test.ts` | 7, 5 | connector 5 |
| `services/token-refresh/tests/integration/{report,parallel}.test.ts` | 5, 4 | connector 5, 6, 7 |
| `services/token-refresh/tests/scale/tenk.test.ts` | 1 | connector 7 (10 000 rows under 10 s) |

Support, also not yours to edit: `features/identity/tests/support/replay/` (a real local OAuth
server: discovery, PKCE, code, rotating refresh tokens, RS256 id tokens, modes `ok`,
`invalid_grant`, `server_error`) and `services/token-refresh/tests/helpers.ts`. Every test name
starts with its rule number, so a failure points at the rule.

## Files you own

Each file at most 80 lines, each folder at most 5 files, a README in every new folder.

| Path | Action | Holds |
|---|---|---|
| `features/identity/src/connectors/{README.md,seal.ts,catalog.ts,schema.ts,refresh.ts}` | new | seal; `providerSecrets`, `catalogTiles`, genericOAuth config; plugin schema with transforms and new columns; refresh with error classes |
| `features/identity/src/login/{README.md,google.ts}` | new | the `google` genericOAuth entry, `/sign-in/google`, its limiter |
| `features/identity/src/pages/connectors/{README.md,routes.ts,view.ts}` | new | link, unlink routes; tile markup |
| `features/identity/src/{config.ts,index.ts,errors.ts,port.ts}` | edit | split `config.ts` (76 lines today) before adding fields; export the new API; `RefreshError`; `accessToken` |
| `features/identity/src/auth/options.ts`, `src/routes/mount.ts`, `src/guard/limits.ts`, `src/pages/views/auth.ts`, `src/pages/signed/connections.ts` | edit | plugins and linking; mount routes; a `google` rule; the button; the tiles |
| `services/token-refresh/src/{index.ts,select.ts,lease.ts,sweep.ts}` | new | the sweep (package, README and tests exist) |

## Public interface

```ts
// @anvesx/identity
interface ProviderEntry { id: string; name: string; description: string; scopes: string[];
  kind: "built-in" | "generic" | "mcp";
  generic?: { discoveryUrl?: string; authorizationUrl?: string; tokenUrl?: string; userInfoUrl?: string; accessType?: "offline" } }
interface IdentityConfig { /* existing */ providers?: ProviderEntry[]; sealKey?: string; env?: Record<string, string | undefined>;
  google?: { clientId: string; clientSecret: string; discoveryUrl?: string } }
class RefreshError extends Error { code: "NEEDS_AUTH" | "LEASED" | "PROVIDER_DOWN" }
function seal(key: Buffer, field: string, plain: string): string;   // base64(nonce 12 | tag 16 | ciphertext)
function open(key: Buffer, field: string, sealed: string): string;  // throws on wrong key, field or byte
function parseSealKey(hex: string): Buffer;                         // IdentityError BAD_INPUT, field "sealKey"
function providerSecrets(id: string, env: Record<string, string | undefined>): { clientId: string; clientSecret: string } | null;
function catalogTiles(entries: ProviderEntry[], env: Record<string, string | undefined>): (ProviderEntry & { configured: boolean })[];
// createIdentity(cfg) also returns:
adapter(): Promise<AuthContext["adapter"]>;
refreshAccount(accountId: string): Promise<void>;  // always refreshes; throws RefreshError; refusal sets needs-auth
port.accessToken(user: string, providerId: string, accountId: string): Promise<string>;

// @anvesx/token-refresh
const WINDOW_MS = 30 * 60_000, LEASE_MS = 2 * 60_000, BATCH = 500;
function selectDue(adapter: Adapter, now: number, limit: number, afterId?: string): Promise<string[]>;
function takeLease(adapter: Adapter, ids: string[], lease: string, now: number): Promise<string[]>; // one write, returns held ids
function releaseLease(adapter: Adapter, ids: string[], lease: string): Promise<void>;
function sweep(deps: { adapter: Adapter; refresh: (accountId: string) => Promise<void>; now: () => number; lease: string; batch?: number }):
  Promise<{ due: number; refreshed: number; failed: string[]; skipped: number }>;
```

## Where the spec did not match the installed API (spec already updated)

1. `databaseHooks` have no read hook, so sealing uses plugin schema field transforms (input
   seals, output opens). The output transform returns null on failure, never throws, so pages
   render and `accessToken` fails closed as `NEEDS_AUTH`.
2. `getAccessToken` and `refreshToken` swallow the provider error and use the wall clock.
   Call `provider.refreshAccessToken` from `(await auth.$context).socialProviders` yourself:
   status 400 or 401 or `invalid_grant` is `NEEDS_AUTH`; 5xx or network is `PROVIDER_DOWN`.
   Compute expiry and the 30-minute window from `cfg.now`.
3. `socialProviders.google` hard-codes Google's endpoints, so Google runs on `genericOAuth`
   with provider id `google` and a discovery URL (default Google's).
4. A relink with `allowDifferentEmails` updates the row but not `status`: reset it to
   `active` in an `account.update` hook (tiles rule 8).
5. `guardedPost` answers 403 when signed out; the link route checks the session first and
   answers 302 `/sign-in` (link rule 1).
6. Organization name for a Google user is `user.name` (the existing hook), not the email
   local part. Linking needs the local user's email verified too (account pre-hijack).
7. `takeLease` re-checks due and active in its conditional write, and `refreshLeaseUntil`
   defaults to 0, so one `lt now` condition frees unleased and expired rows alike.
8. The tile shows the provider email: fetch it with `provider.getUserInfo` in an
   `account.create.after` hook and store a `label` column.

## Out of scope

`kind: "mcp"` (rule 10: `@modelcontextprotocol/client` is not installed), the e2e Chromium
tests, per-document zones, SCIM, a custom-manifest catalog UI, Microsoft or GitHub login.

## Commands (all green before the first commit)

```sh
pnpm --filter @anvesx/identity test
pnpm --filter @anvesx/token-refresh test
pnpm --filter @anvesx/token-refresh scale          # prints refreshed/10000 and ms
pnpm --filter @anvesx/identity typecheck && pnpm --filter @anvesx/token-refresh typecheck
pnpm biome check features/identity services/token-refresh
pnpm structure && pnpm guard:fakes
pnpm --filter @anvesx/token-refresh mutation       # break 80
pnpm --filter @anvesx/identity mutation            # add src/connectors/seal.ts to its mutate list; break 80
```

## Owner rules (verbatim)

no stubs, no fakes, no placeholder data, no tests that pass for the sake of green; OSI-licensed
libraries only; hand-written code minimal; inline comments a junior can read; inject clock and
I/O; never commit secrets (provider ids/secrets only from env); structure lint (`pnpm
structure`) must pass; commitlint subject lower-case; commit body lines at most 100 columns; no
attribution lines in commits; never bypass hooks.

If something in the spec does not match the installed API, say so and stop: do not edit a
test, do not invent an API. Contract and money changes go to a PR for a human merge (A15).
