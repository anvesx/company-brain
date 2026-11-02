# sync

Runs one account's connector into the brain graph, and undoes it on disconnect.

- `route.ts`: `syncRoute(router, deps)` adds `POST /:id/sync` to the accounts router. Owner only. Body `{repo: "owner/repo"}` for a github account, nothing for drive. An oauth account with a refresh token is refreshed first; a refused refresh makes the account `needs-auth` and the call answers 409. 501 when `deps.sync` is not set, 502 when the source fails.
- `run.ts`: `runAccountSync` builds the adapter with the account's own token and calls `graph-sync`.
- `connector.ts`: `connectorFor` (GitHub or Drive adapter) and `sourceOf`. Every account writes under its own graph source, `<provider>:<account id>`, so two GitHub accounts do not share edges.
- `disconnect.ts`: `disconnect` closes the account's `can-read` and `member-of` edges with `edgesBySource`, then removes the account and rewrites the token file. Documents stay in the graph with no readers from that account.

Zones and the owner are stamped by [`src/graph`](../graph/README.md). Graph times are milliseconds, as in `apps/brain`.
