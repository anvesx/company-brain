# 0009: Connector sign-in and token refresh on better-auth account linking

Architecture decision record (ADR) 0009. Status: accepted, 6 Nov 2026. Decided by the builder.
Amends ADR [0003](0003-connector-sourcing.md) (OAuth on arctic) and the reuse decision in
[docs/specs/app/connections.md](../../specs/app/connections.md).

## Context

Each connector on the connections page must be one button. Clicking it sends the person to the
provider's own sign-in page, and the account stays usable for a year without a second sign-in.
The access token must be refreshed on a 15 minute cadence, for every provider and for every
remote Model Context Protocol (MCP) server the brain connects to.

Today the connections app runs its own OAuth flow on `arctic` 3.7.0. arctic is deprecated by its
author as of July 2026. The flow keeps its state in process memory (a restart drops every
sign-in in flight), stores tokens on its own `accounts` table, and refreshes a token only when a
sync is requested by hand. Nothing refreshes on a schedule.

## Evidence

Checked 6 Nov 2026 against the installed packages and the vendors' documents.

| Need | Library | Finding |
|---|---|---|
| Provider sign-in with one call | better-auth 1.7.18 `linkSocialAccount` | Returns the provider URL; the callback writes an `account` row with access token, refresh token, scope and both expiry times |
| Refresh | better-auth `getAccessToken` | Refreshes when `accessTokenExpiresAt` is within 5 s; 35 of 37 built-in providers implement `refreshAccessToken` (not vercel, wechat; zoom partial) |
| Providers without a built-in | better-auth `genericOAuth` plugin | Refreshes when the expiry is known; `accessType: "offline"` and `accessTokenExpiresIn` per provider |
| Remote MCP servers | `@modelcontextprotocol/client` 2.x (MIT) `OAuthClientProvider` | Discovery, dynamic client registration, PKCE and refresh per the MCP authorization spec, on the transport itself |
| Token encryption | better-auth `databaseHooks` on `account` | Encrypt before create and update, decrypt on read; the connections app's AES-256-GCM seal is reused |
| Year-long access | Provider policy | Google refresh tokens last until revoked or 6 months unused once the consent screen is in Production (7 days while in Testing); GitHub App user tokens 8 h with a 6 month rotating refresh; Slack rotation is opt-in, 12 h access, single-use refresh |

Rejected: Nango (Elastic License, not Open Source Initiative approved); keeping arctic (deprecated,
and it duplicates what better-auth already stores for sign-in).

## Decision

- Connector accounts are better-auth `account` rows linked to the signed-in user. The button on
  the connections page is a form that calls `linkSocialAccount` and redirects to the provider.
  Built-in providers (google, github, slack and the rest) use better-auth's own code;
  anything else is a `genericOAuth` entry in the catalog manifest.
- Tokens are encrypted at rest by `databaseHooks` with the `CONNECTIONS_KEY` seal. Plain
  tokens never reach the database.
- A refresh service sweeps every 15 minutes. It refreshes every account whose access token
  expires in the next 30 minutes, so no token is used in its last 15 minutes, and marks an
  account `needs-auth` when the provider refuses. Rows are leased so two replicas never refresh
  the same row. The page shows `needs-auth` as a re-consent button.
- Remote MCP servers are reached through the MCP client's `OAuthClientProvider`, which
  stores its tokens in the same encrypted `account` table under provider `mcp:<server id>`.
- The arctic flow, the in-memory state store and the connections `accounts` table are removed
  once the linked flow passes the acceptance suite. No second account model stays behind.

## Consequences

- The connections app and identity share one database, so the connections page moves into
  the identity feature's signed-in pages and reads `account` rows through the adapter.
- The provider's own policy sets the ceiling on "a year". Google needs the consent screen in
  Production; that is a console setting, recorded in the runbook, not code.
- Every refresh is one row update; at 1 million accounts the sweep is 1 million updates per
  hour at most, batched 500 per lease. The service spec holds the budget and the test.
- Open items, each a test before the slice is done: refresh under a revoked grant, a provider
  that returns no expiry, two replicas sweeping at once, a restart mid-sweep.
