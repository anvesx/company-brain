# tokens

Credentials are sealed in Postgres by `@anvesx/connector-vault` (AES-256-GCM, one tenant per transaction, row-level security). The account rows and files hold none.

- `open.ts`: `openVault(pool, keys, authSecret)` creates the table under an advisory lock (replicas may boot together) and opens the vault. `createWithToken` stores the account row and its token together and removes the row again if the vault refuses.
- `probe.ts`: `probeToken` tells a dead token (401) from a refused request (403), because the connectors map both to FORBIDDEN. GitHub is probed with `GET /user`; providers with no probe read as rejected.
- `refresh.ts`: `refreshAccount` runs the vault's lease-based `refreshOne` with `httpExchange` for an oauth account whose provider has a client; a refused refresh flips the account to `needs-auth`. `tokenFor` returns the bearer to list with and refreshes first when the token is due (expiry within 60 seconds); a token of unknown expiry is refreshed only after the provider rejects it (`sync/account.ts`).
