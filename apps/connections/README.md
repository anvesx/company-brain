# @anvesx/connections-app

Accounts for the sources the brain reads (GitHub, Google Drive). Stores each credential encrypted, enforces who may widen an account to the whole company, serves a small `/v1` HTTP API, runs OAuth sign-in with `arctic`, refreshes expired tokens, syncs an account's source into the graph, and writes the `BRAIN_USER_TOKENS_FILE` that `brain serve` reads.

Spec: [docs/specs/app/connections.md](../../docs/specs/app/connections.md). Slack and Gmail are not built yet.

`checkZones` (`src/accounts/rules/widen.ts`) requires an explicit `liveRecheck` boolean. Omitting it, or passing null, undefined or a non-boolean, returns `{ ok: false }` (fail closed).

## Install

`@anvesx/connectors` 0.1.0 comes from GitHub Packages, not a sibling checkout. The root `.npmrc` maps the `@anvesx` scope to `https://npm.pkg.github.com` and reads the token from `NODE_AUTH_TOKEN`. Set it to a token with `read:packages` before `pnpm install`:

```sh
export NODE_AUTH_TOKEN=<token with read:packages>
pnpm install
```

## Run the tests

```sh
pnpm --filter @anvesx/connections-app test
pnpm --filter @anvesx/connections-app typecheck
```

## Run it

Workspace packages (`@anvesx/design-system`, `@anvesx/google-identity`, the graph packages) are consumed from their `dist/`, so they must be built before the app. Build the app together with everything it depends on, never the app alone:

```sh
pnpm --filter '@anvesx/connections-app...' build   # the trailing ... adds its dependencies, in dependency order
```

Typecheck and tests need both builds: `pnpm --filter '@anvesx/connections-app...' build` and `pnpm --filter '@anvesx/brain-app...' build`. A bare `pnpm --filter <pkg> build` on a fresh clone fails because the dependencies have no `dist/` yet.

```sh
CONNECTIONS_KEY=$(openssl rand -hex 32) CONNECTIONS_AUTH_SECRET=$(openssl rand -hex 32) \
  CONNECTIONS_DB_PATH=./connections.db CONNECTIONS_GRAPH_PATH=./graph.db \
  CONNECTIONS_ADMINS=acme:root node apps/connections/dist/bin.js
```

It listens on 127.0.0.1:8788, prints the address, and exits 1 with every bad setting named if the config is wrong. SIGTERM closes it. The settings are listed in [src/cli](src/cli/README.md).

## Pages

Behind Google sign-in the app serves server-rendered pages at `/`: the Connections directory and table, the add-connector consent page (`/connect/:provider`, one button that does a full-page redirect to the provider's own sign-in) and the account page (`/accounts/:id`: health, Sync now, repository, Disconnect). Disconnect asks first on its own panel ("Keep it" or Disconnect). Connectors with no OAuth client on this server collapse into one "Not available on this server" list. The sign-in page is a centered card in the same shell. There is no field for a token or password. Each page action calls the matching `/v1` route. The directory is grouped by the `category` that `GET /v1/catalog` returns; the consent page shows what each app reads in plain sentences, not raw scopes. A needs-reconnect account offers Reconnect (a full-page hop to `/v1/oauth/:provider/start`), and signing in again as the same identity renews that account instead of adding a second one. Sync is disabled until a GitHub account has a repository, and Clear repository empties it. Error notes come from a fixed table of codes, never from query text; a store failure on the callback reads "Could not save the connection, try again." (`oauth_error=store`). In dark mode the ground follows the design-system `--paper` token. See [src/ui](src/ui/README.md). Sync is manual: nothing runs it on a schedule yet.

## Sync

`POST /v1/accounts/:id/sync` (owner only) runs the connector for that account with its stored token (an OAuth account is refreshed first) and writes the result into the graph file. Every document gets the account's `owner` and its `dataZone` as a core-types zone (`private` and `personal` become `personal` and are written owner-only; `company` stays `company` and keeps the source's readers; see [src/graph](src/graph/README.md)). Documents are stored under `<provider>:<accountId>/<address>` so accounts never collide (see [src/graph](src/graph/README.md)). For GitHub the body is `{"repo": "owner/repo"}`; when the body has none, the account's own `repo` (`owner/name`, github accounts only, set on create or patch, `null` clears it) is used. A successful sync sets the account's `lastSyncAt` (milliseconds; `null` before the first) and clears the failure count; a failed one adds 1 to it and keeps the reason, both shown on the pages (not in the API's account shape). Answers: 200 with the sync report, 400 bad body or no connector, 404, 403 not the owner, 409 account needs re-authorisation, 502 the source failed, 501 no graph configured.

`DELETE /v1/accounts/:id` first closes the `can-read` and `member-of` edges that account wrote, then removes it. Documents stay.

## Mutation tests

`pnpm --filter @anvesx/connections-app mutation` runs Stryker (break below 80). Last run: 84.58 overall; src/cli 94.8, src/sync 87.7, src/tokens 93.8, src/oauth/refresh.ts 94.4.

## Config

- `CONNECTIONS_KEY`: 64 hex characters (`openssl rand -hex 32`), the AES-256-GCM key for stored credentials.
- Bearer: `user:tenant:exp:hmac-sha256-hex(secret, "user:tenant:exp")`, the same as the brain app.
- `CONNECTIONS_AUTH_SECRET`, `CONNECTIONS_DB_PATH`, `CONNECTIONS_GRAPH_PATH`, `CONNECTIONS_ADMINS` and the rest: see [src/cli/README.md](src/cli/README.md).
