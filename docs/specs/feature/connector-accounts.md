# Spec: connector-accounts

Tier: feature (inside `@anvesx/identity`), plus `services/token-refresh`. Decision: ADR
[0009](../../adr/product/0009-connector-oauth-on-better-auth.md). Replaces the OAuth part of
[app/connections.md](../app/connections.md).

Exact source: our proposal. The screen follows the Claude connectors page: one tile per
connector, one button each.

## Purpose
A signed-in person clicks a connector and lands on the provider's own sign-in page. After
consent the account is linked to their user and organization, its tokens are encrypted at
rest, and a service keeps the access token fresh on a 15 minute cadence for as long as the
provider allows, up to a year and beyond. A refused refresh turns the tile into a re-consent
button; nothing is deleted silently.

## Reuse decision
better-auth 1.7.18 account linking (`linkSocialAccount`, `getAccessToken`, `listUserAccounts`,
`unlinkAccount`) for built-in providers; the `genericOAuth` plugin for the rest;
`@modelcontextprotocol/client` 2.x `OAuthClientProvider` for remote MCP servers. We write:
the catalog of providers (data), the encrypt and decrypt `databaseHooks`, the tiles, the
sweep service and the tests. No hand-written OAuth, PKCE, state or token exchange.

## Public interface
```ts
// identity config gains:
interface ProviderEntry { id: string; name: string; description: string;
  scopes: string[]; kind: "built-in" | "generic" | "mcp";
  generic?: { authorizationUrl: string; tokenUrl: string; clientId: string; clientSecret: string; accessType?: "offline" } }
interface IdentityConfig { /* existing */ providers?: ProviderEntry[]; sealKey?: string /* 64 hex, AES-256-GCM */ }
// identity port gains:
interface IdentityPort { accessToken(user: string, providerId: string, accountId: string): Promise<string> } // refreshes if due; throws NEEDS_AUTH
// services/token-refresh:
interface SweepDeps { adapter: Adapter; refresh: (accountId: string) => Promise<void>; now: () => number; lease: string; batch?: number /* default 500 */ }
interface SweepReport { due: number; refreshed: number; failed: string[]; skipped: number }
sweep(deps: SweepDeps): Promise<SweepReport>
class RefreshError extends Error { code: "NEEDS_AUTH" | "LEASED" | "PROVIDER_DOWN" }
```

## Behaviour
1. `GET /connections` shows one tile per `providers` entry. A tile is a form `POST /connections/link/:id` (csrf) that answers 302 to the provider URL from `linkSocialAccount` with `callbackURL=/connections`. Unknown id: 404. Not signed in: 302 to `/sign-in`.
2. After the callback the tile shows the linked account (provider email or login, linked time, status). An organization member sees only their own accounts.
3. Tokens are encrypted by `databaseHooks` before every create and update of `account` and decrypted on read. A row read with the wrong key fails closed as `NEEDS_AUTH`, never as plain text. The seal is the connections app's AES-256-GCM: 12 byte nonce, 16 byte tag, key from `sealKey`.
4. `port.accessToken` returns the current token; when `accessTokenExpiresAt` is within 30 minutes it refreshes first. A provider refusal (`invalid_grant`, 400, 401) sets status `needs-auth` and throws `NEEDS_AUTH`; a 5xx or network error throws `PROVIDER_DOWN` and leaves the row alone.
5. `sweep` selects rows with `accessTokenExpiresAt < now + 30 min` and status active, takes a lease (`refreshLease = lease, refreshLeaseUntil = now + 2 min`) with one conditional update per batch, refreshes each, and clears the lease. A row leased by another replica is skipped and counted. A row with no expiry is skipped (the provider never said; it is refreshed on use by rule 4).
6. Two replicas sweeping at once refresh each row once. A crash mid-sweep leaves leases that expire in 2 minutes; the next sweep takes them.
7. Budget: 500 rows per batch, each refresh one provider call and one row update. At 1 million due rows a sweep is 2,000 batches; the test proves 10,000 rows in under 10 s with a fake-free provider (a local HTTP replay server), and the sweep report counts match the rows.
8. `needs-auth` tiles show a "Sign in again" button that runs rule 1 again; success returns status active and keeps the account id.
9. Unlink is `POST /connections/unlink/:accountId` (csrf), answers 303 to `/connections`; another user's account id is 404 and the row stays.
10. Remote MCP servers (`kind: "mcp"`) link through `OAuthClientProvider`; the provider stores tokens in `account` under provider `mcp:<id>` so rules 3 to 8 apply unchanged.
11. Secrets come from the environment, never from the catalog file: `<ID>_CLIENT_ID`, `<ID>_CLIENT_SECRET` upper-cased. A provider listed without both is shown greyed with "not configured", not hidden.

## Acceptance tests (written first)
- unit: seal round trip, wrong key fails closed, due-row selection boundary (29:59 vs 30:01), lease take and expiry, report counts.
- integration: link against a replay OAuth server (real better-auth flow), encrypted row on disk (grep the SQLite file for the token: absent), `accessToken` refreshes at 29 minutes and not at 31, `invalid_grant` turns the tile to re-consent, two sweeps in parallel refresh each row once, 10k rows under 10 s.
- e2e: Chromium clicks the GitHub tile, consents on the replay server, sees the linked tile; screenshot.
- mutation: Stryker >= 80 on the sweep and the seal.

## Layout
`features/identity/src/connectors/{catalog.ts,seal.ts,hooks.ts,link.ts,README.md}`, pages under `src/pages/signed/connections*.ts`; `services/token-refresh/{src/{sweep.ts,lease.ts,select.ts,index.ts},tests,README.md}`.

## Out of scope
Per-document zones, SCIM, the connectors catalog UI for custom manifests (data only here).
