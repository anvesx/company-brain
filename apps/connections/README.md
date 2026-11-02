# @anvesx/connections-app

Accounts for the sources the brain reads (GitHub, Google Drive). Stores each credential encrypted, enforces who may widen an account to the whole company, serves a small `/v1` HTTP API, runs OAuth sign-in with `arctic`, refreshes expired tokens, syncs an account's source into the graph, and writes the `BRAIN_USER_TOKENS_FILE` that `brain serve` reads.

Spec: [docs/specs/app/connections.md](../../docs/specs/app/connections.md). Slack and Gmail are not built yet.

## Run the tests

```sh
pnpm --filter @anvesx/connections-app test
pnpm --filter @anvesx/connections-app typecheck
```

## Run it

```sh
pnpm --filter @anvesx/connections-app build
CONNECTIONS_KEY=$(openssl rand -hex 32) CONNECTIONS_AUTH_SECRET=$(openssl rand -hex 32) \
  CONNECTIONS_DB_PATH=./connections.db CONNECTIONS_GRAPH_PATH=./graph.db \
  CONNECTIONS_ADMINS=acme:root node apps/connections/dist/bin.js
```

It listens on 127.0.0.1:8788, prints the address, and exits 1 with every bad setting named if the config is wrong. SIGTERM closes it. The settings are listed in [src/cli](src/cli/README.md).

## Sync

`POST /v1/accounts/:id/sync` (owner only) runs the connector for that account with its stored token (an OAuth account is refreshed first) and writes the result into the graph file. Every document gets the account's `owner` and its `dataZone` as a core-types zone (`private` and `personal` become `personal` and are written owner-only; `company` stays `company` and keeps the source's readers; see [src/graph](src/graph/README.md)). Documents are stored under `<provider>:<accountId>/<address>` so accounts never collide (see [src/graph](src/graph/README.md)). For GitHub the body is `{"repo": "owner/repo"}`; when the body has none, the account's own `repo` (`owner/name`, github accounts only, set on create or patch, `null` clears it) is used. A successful sync sets the account's `lastSyncAt` (milliseconds; `null` before the first). Answers: 200 with the sync report, 400 bad body or no connector, 404, 403 not the owner, 409 account needs re-authorisation, 502 the source failed, 501 no graph configured.

`DELETE /v1/accounts/:id` first closes the `can-read` and `member-of` edges that account wrote, then removes it. Documents stay.

## Mutation tests

`pnpm --filter @anvesx/connections-app mutation` runs Stryker (break below 80). Last run: 84.58 overall; src/cli 94.8, src/sync 87.7, src/tokens 93.8, src/oauth/refresh.ts 94.4.

## Config

- `CONNECTIONS_KEY`: 64 hex characters (`openssl rand -hex 32`), the AES-256-GCM key for stored credentials.
- Bearer: `user:tenant:exp:hmac-sha256-hex(secret, "user:tenant:exp")`, the same as the brain app.
- `CONNECTIONS_AUTH_SECRET`, `CONNECTIONS_DB_PATH`, `CONNECTIONS_GRAPH_PATH`, `CONNECTIONS_ADMINS` and the rest: see [src/cli/README.md](src/cli/README.md).
