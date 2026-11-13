# src

- `deps.ts`: what `createApp` needs (store, vault, cursors, bearer secret, clock, admin check, oauth providers, jobs, webhook secret).
- `index.ts`: public exports.
- `accounts/`: the account model, the widening rule and the SQLite store. No credential lives here.
- `tokens/`: the Postgres vault (AES-GCM, `features/connector-vault`) and refresh on expiry.
- `jobs/`: the background sync: a pg-boss queue, retries with backoff, dead letters and the poll (see its README).
- `webhook/`: `POST /v1/webhooks/github`, signature checked, queues a sync (see its README).
- `http/`: the Hono app, bearer or session auth and `/v1/accounts` routes.
- `ui/`: the browser pages, server-rendered with the design system (see its README).
- `login/`: Google-only sign-in for the page (see its README).
- `catalog/`: `GET/POST /v1/catalog`, the connector list read from the registry (see its README).
- `net/`: the check that a tenant-supplied url does not point at this server's own network (see its README).
- `oauth/`: GitHub and Google sign-in with arctic.
- `cli/`: reads the environment, opens the stores and the jobs and starts the server. `bin.ts` is the thin launcher.
- `sync/`: `syncAccount` (one account into the graph, used by Sync now and the jobs), the route, and disconnect.
