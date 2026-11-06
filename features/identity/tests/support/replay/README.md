# tests/support/replay

A real OAuth 2.0 provider on a local port, used by the connector, Google login and token-refresh
tests. It is a running HTTP server, not a replacement for better-auth: better-auth talks to it
over the network exactly as it talks to Google or GitHub.

| File          | Holds                                                                                |
| ------------- | ------------------------------------------------------------------------------------ |
| `server.ts`   | `startReplay({ oidc? })`: discovery, `/authorize`, `/token`, `/userinfo`, `/jwks`    |
| `handlers.ts` | The endpoint logic and the `State` tests read and change (`mode`, `user`, `calls`)   |
| `tokens.ts`   | Codes (one use, PKCE S256), rotating refresh tokens, RS256 id tokens                 |
| `flow.ts`     | `connectorConfig`, `googleConfig`, `follow` (browser redirect chain), `seedAccounts` |

Switches a test can flip:

- `replay.state.mode = "invalid_grant"`: every refresh answers 400 `invalid_grant`.
- `replay.state.mode = "server_error"`: every refresh answers 500.
- `replay.state.user = { ... }`: the next authorize signs in this person.
- `replay.state.expiresIn`: seconds in the next token response.
- `replay.state.delayMs`: milliseconds every refresh waits before answering (to overlap two processes).

Refresh tokens rotate, so refreshing the same row twice fails the second time. That is how the
parallel sweep test proves each row is refreshed once.
