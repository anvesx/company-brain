# src

- `deps.ts`: what `createApp` needs (store, bearer secret, clock, admin check, oauth providers).
- `index.ts`: public exports.
- `accounts/`: the account model, the widening rule, encryption and the SQLite store.
- `http/`: the Hono app, bearer auth and `/v1/accounts` routes.
- `tokens/`: the writer for the brain's per-user token file.
- `oauth/`: GitHub and Google sign-in with arctic.
