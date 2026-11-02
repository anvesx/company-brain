# src

- `deps.ts`: what `createApp` needs (store, bearer secret, clock, admin check, oauth providers).
- `index.ts`: public exports.
- `accounts/`: the account model, the widening rule, encryption and the SQLite store.
- `http/`: the Hono app, bearer auth and `/v1/accounts` routes.
- `tokens/`: the writer for the brain's per-user token file.
- `catalog/`: `GET/POST /v1/catalog`, the connector list read from the registry (see its README).
- `oauth/`: GitHub and Google sign-in with arctic.
- `cli/`: reads the environment, opens the files and starts the server. `bin.ts` is the thin launcher.
- `sync/`: `POST /v1/accounts/:id/sync`, the per-account connector, zone and owner stamping, and disconnect.
