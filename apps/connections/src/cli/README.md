# cli

Turns environment variables into a running server. `src/bin.ts` is a thin launcher over `start`.

- `config.ts`: `parseConfig(env)` reads the settings and throws one error naming every bad one. Nothing is opened before it passes.
- `oauth-env.ts`: `oauthFromEnv` builds the GitHub and Google sign-in providers when their client settings are present.
- `start.ts`: `start(env, now)` opens the account store and the graph, wires the app (admins, oauth, sync, token file) and listens on 127.0.0.1.

| Variable                                                                       | Meaning                                                                          |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `CONNECTIONS_KEY`                                                              | 64 hex characters, AES-256-GCM key for stored credentials                        |
| `CONNECTIONS_AUTH_SECRET`                                                      | 32+ characters, signs the `user:tenant:exp:hmac` bearer, same as the brain app   |
| `CONNECTIONS_DB_PATH`                                                          | SQLite file for accounts                                                         |
| `CONNECTIONS_GRAPH_PATH`                                                       | SQLite graph file that sync writes and the brain app reads                       |
| `CONNECTIONS_ADMINS`                                                           | optional, comma-separated `tenant:user` tenant admins                            |
| `CONNECTIONS_PORT`                                                             | optional, default 8788, 0 picks a free port                                      |
| `CONNECTIONS_GITHUB_API_URL`                                                   | optional, GitHub REST base URL (GitHub Enterprise); default api.github.com       |
| `CONNECTIONS_TOKENS_FILE`                                                      | optional, the `BRAIN_USER_TOKENS_FILE` to keep current (mode 600)                |
| `CONNECTIONS_PUBLIC_URL`, `GITHUB_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET` | optional, turn on oauth sign-in; the URL must be where the callback is reachable |
