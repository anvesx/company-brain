# cli

Turns environment variables into a running server. `src/bin.ts` is a thin launcher over `start`.

- `config.ts`: `parseConfig(env)` reads the settings and throws one error naming every bad one. Nothing is opened before it passes.
- `oauth-env.ts`: `oauthFromEnv` builds one sign-in provider per oauth app in the registry when its `<APP>_CLIENT_ID` settings are present (`GITHUB_*`, `GOOGLE_*`).
- `start.ts`: `start(env, now, opts)` opens the account store, the graph, the Postgres vault and cursors, starts the jobs and wires the app (admins, oauth, sync, webhook) and listens on 127.0.0.1. `opts` goes to `createApp`; `src/bin.ts` passes `{ uiRedirect: "/" }` so the OAuth callback returns the browser to the Connections page.

| Variable                                                                       | Meaning                                                                                                     |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `CONNECTIONS_DATABASE_URL`                                                     | Postgres for the vault and the job queue                                                                    |
| `CONNECTOR_VAULT_KEYS`                                                         | `kid:hex64[,kid:hex64]` AES-GCM keys for the vault; must differ from the auth secret                        |
| `CONNECTIONS_AUTH_SECRET`                                                      | 32+ characters, signs the `user:tenant:exp:hmac` bearer, same as the brain app                              |
| `CONNECTIONS_DB_PATH`                                                          | SQLite file for accounts                                                                                    |
| `CONNECTIONS_GRAPH_PATH`                                                       | SQLite graph file that sync writes and the brain app reads                                                  |
| `CONNECTIONS_ADMINS`                                                           | optional, comma-separated `tenant:user` tenant admins                                                       |
| `CONNECTIONS_PORT`                                                             | optional, default 8788, 0 picks a free port                                                                 |
| `CONNECTIONS_ALLOW_LOOPBACK`                                                   | optional, `1` lets a custom connector on loopback over http be registered; development only, off by default |
| `CONNECTIONS_GITHUB_API_URL`                                                   | optional, GitHub REST base URL (GitHub Enterprise); default api.github.com                                  |
| `CONNECTIONS_GITHUB_WEBHOOK_SECRET`                                            | optional, 16+ chars, turns on `POST /v1/webhooks/github` (HMAC-SHA256)                                      |
| `CONNECTIONS_POLL_MINUTES`, `CONNECTIONS_TENANT_CONCURRENCY`                   | optional, poll interval (default 15) and syncs at once per tenant (default 2)                               |
| `CONNECTIONS_MAX_BACKLOG_PER_TENANT`, `CONNECTIONS_CURSOR_PATH`                | optional, queued syncs per tenant (default 500) and the change-cursor file (default `<db>.cursors`)         |
| `CONNECTIONS_PUBLIC_URL`, `GITHUB_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET` | optional, turn on oauth sign-in; the URL must be where the callback is reachable                            |
