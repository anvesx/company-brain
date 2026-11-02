# @brain/connections-app

Accounts for the sources the brain reads (GitHub, Google Drive). Stores each credential encrypted, enforces who may widen an account to the whole company, serves a small `/v1` HTTP API, runs OAuth sign-in with `arctic`, and writes the `BRAIN_USER_TOKENS_FILE` that `brain serve` reads.

Spec: [docs/specs/app/connections.md](../../docs/specs/app/connections.md). Slack, Gmail, sync and the web UI are not built yet.

## Run the tests

```sh
pnpm --filter @brain/connections-app test
pnpm --filter @brain/connections-app typecheck
```

## Config

- `CONNECTIONS_KEY`: 64 hex characters (`openssl rand -hex 32`), the AES-256-GCM key for stored credentials.
- Bearer: `user:tenant:exp:hmac-sha256-hex(secret, "user:tenant:exp")`, the same as the brain app.
